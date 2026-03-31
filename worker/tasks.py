"""RQ worker job for background removal using rembg.

This module runs in a SYNCHRONOUS forked subprocess managed by RQ.
Do NOT use async/await anywhere in this file.

CRITICAL (PITFALLS.md Pitfall 1, UPLD-12):
- rembg session is created ONCE at module level and reused across all jobs.
- Docker --max-jobs 100 (in docker-compose.yml) handles process recycling.
- Docker memory limit is 2GB (in docker-compose.yml).
"""

from __future__ import annotations

import io
import logging
import os
import time

from PIL import Image
from minio import Minio
from rembg import new_session, remove
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level rembg session: loaded once, reused across all jobs in this fork.
# The model is pre-downloaded and pre-warmed in the worker Dockerfile.
# ---------------------------------------------------------------------------
# Use u2net on 4GB VPS (300MB RAM, ~3s per image)
# Switch to birefnet-general when VPS has 8GB+ RAM
_model = os.environ.get("REMBG_MODEL", "u2net")
logger.info("Loading rembg model: %s", _model)
rembg_session = new_session(_model)

# ---------------------------------------------------------------------------
# Configuration from environment (shared .env with backend)
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://marketfoto:password@postgres:5432/marketfoto"
)
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")
S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "minio:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "marketfoto")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "changeme")

# ---------------------------------------------------------------------------
# Synchronous SQLAlchemy engine (NOT async -- RQ workers run sync code)
# ---------------------------------------------------------------------------
_sync_engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=2)

# ---------------------------------------------------------------------------
# MinIO client (synchronous)
# ---------------------------------------------------------------------------
_minio_client = Minio(
    S3_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=S3_ACCESS_KEY,
    secret_key=S3_SECRET_KEY,
    secure=S3_ENDPOINT.startswith("https://"),
)


def _update_image_status(
    image_id: str,
    *,
    status: str,
    processed_url: str | None = None,
    processing_time_ms: int | None = None,
    error_message: str | None = None,
) -> None:
    """Update image record in PostgreSQL using raw SQL (sync)."""
    with _sync_engine.connect() as conn:
        conn.execute(
            text(
                "UPDATE images SET status = :status, "
                "processed_url = :processed_url, "
                "processing_time_ms = :processing_time_ms, "
                "error_message = :error_message "
                "WHERE id = CAST(:image_id AS uuid)"
            ),
            {
                "status": status,
                "processed_url": processed_url,
                "processing_time_ms": processing_time_ms,
                "error_message": error_message,
                "image_id": image_id,
            },
        )
        conn.commit()


def _get_image_original_url(image_id: str) -> str | None:
    """Fetch original_url from DB for the given image."""
    with _sync_engine.connect() as conn:
        result = conn.execute(
            text("SELECT original_url FROM images WHERE id = CAST(:image_id AS uuid)"),
            {"image_id": image_id},
        )
        row = result.fetchone()
        return row[0] if row else None


def remove_background_job(image_id: str, user_id: str) -> None:
    """Remove background from an image using rembg.

    Called by RQ with job_timeout=30 (set at enqueue time).
    If the job exceeds 30s, RQ raises JobTimeoutException and kills the fork.

    Args:
        image_id: UUID string of the image record.
        user_id: UUID string of the owning user.
    """
    start_time = time.time()

    try:
        # Step 1: Mark as processing
        _update_image_status(image_id, status="processing")
        logger.info("Processing image %s for user %s", image_id, user_id)

        # Step 2: Get original_url from DB to know the object key
        original_url = _get_image_original_url(image_id)
        if not original_url:
            raise ValueError(f"Image record not found: {image_id}")

        # Step 3: Download original from MinIO
        try:
            response = _minio_client.get_object("originals", original_url)
            original_bytes = response.read()
            response.close()
            response.release_conn()
        except Exception as exc:
            raise RuntimeError(f"Failed to download original image: {exc}") from exc

        # Step 4: Open with Pillow, remove background with rembg session reuse
        try:
            input_image = Image.open(io.BytesIO(original_bytes)).convert("RGBA")
            result_image = remove(input_image, session=rembg_session)
        except Exception as exc:
            raise RuntimeError(f"Background removal failed: {exc}") from exc

        # Step 5: Save result as PNG to BytesIO
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format="PNG")
        output_buffer.seek(0)
        png_bytes = output_buffer.getvalue()

        # Step 6: Upload to MinIO processed bucket
        processed_key = f"{user_id}/{image_id}.png"
        try:
            _minio_client.put_object(
                "processed",
                processed_key,
                io.BytesIO(png_bytes),
                len(png_bytes),
                content_type="image/png",
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to save processed image: {exc}") from exc

        # Step 7: Calculate processing time and update DB
        processing_time_ms = int((time.time() - start_time) * 1000)

        _update_image_status(
            image_id,
            status="processed",
            processed_url=processed_key,
            processing_time_ms=processing_time_ms,
        )

        logger.info(
            "Image %s processed in %dms", image_id, processing_time_ms
        )

    except Exception as exc:
        # Catch-all: mark as failed with error message (UPLD-09)
        elapsed_ms = int((time.time() - start_time) * 1000)
        error_msg = str(exc)[:500]

        # Check for timeout specifically
        exc_type = type(exc).__name__
        if "TimeoutException" in exc_type or "JobTimeoutException" in exc_type:
            error_msg = "Timeout: processing exceeded 30 seconds"

        logger.error("Image %s failed: %s", image_id, error_msg)

        try:
            _update_image_status(
                image_id,
                status="failed",
                error_message=error_msg,
                processing_time_ms=elapsed_ms,
            )
        except Exception:
            # If DB update itself fails, log but don't mask the original error
            logger.exception("Failed to update image status to 'failed'")

        raise


# ---------------------------------------------------------------------------
# Render card job: Pillow compositing pipeline
# ---------------------------------------------------------------------------

import numpy as np
from PIL import ImageDraw, ImageFilter, ImageFont

FONTS_DIR = os.environ.get("FONTS_DIR", "/app/fonts")

MARKETPLACE_SIZES = {
    "wb": (900, 1200),
    "ozon": (1200, 1200),
    "ym": (800, 800),
}

# Font family name -> TTF filename mapping (matches frontend font registry)
FONT_MAP = {
    "Inter": "Inter",
    "Montserrat": "Montserrat",
    "Rubik": "Rubik",
    "Nunito": "Nunito",
    "Roboto": "Roboto",
    "Open Sans": "Open_Sans",
    "Raleway": "Raleway",
    "PT Sans": "PT_Sans",
    "Comfortaa": "Comfortaa",
    "Exo 2": "Exo_2",
    "Jost": "Jost",
    "Manrope": "Manrope",
    "Play": "Play",
    "Golos Text": "Golos_Text",
}


def _load_font(family: str, size: int, weight: str = "normal") -> ImageFont.FreeTypeFont:
    """Load TTF font from FONTS_DIR. Falls back to default if not found."""
    base_name = FONT_MAP.get(family, "Inter")
    suffix = "Bold" if weight == "bold" else "Regular"

    # Try specific weight file first, then variable font, then Inter fallback
    candidates = [
        os.path.join(FONTS_DIR, f"{base_name}-{suffix}.ttf"),
        os.path.join(FONTS_DIR, f"{base_name}-Variable.ttf"),
        os.path.join(FONTS_DIR, "Inter-Variable.ttf"),  # ultimate fallback
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size=int(size))
            except Exception:
                continue

    # Pillow built-in fallback (basic, no Cyrillic -- last resort)
    logger.warning("Font not found: %s %s, using default", family, suffix)
    return ImageFont.load_default()


def _hex_to_rgba(hex_color: str, alpha: int = 255) -> tuple:
    """Convert '#RRGGBB' or 'rgba(r,g,b,a)' to (R, G, B, A) tuple."""
    if hex_color.startswith("rgba("):
        parts = hex_color.replace("rgba(", "").replace(")", "").split(",")
        r, g, b = int(parts[0].strip()), int(parts[1].strip()), int(parts[2].strip())
        a = int(float(parts[3].strip()) * 255)
        return (r, g, b, a)
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return (r, g, b, alpha)


def _get_render_data(render_id: str):
    """Fetch render record + template config + image processed_url + user plan."""
    with _sync_engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT r.id, r.user_id, r.image_id, r.template_id, "
                "r.overlay_data, r.marketplace, r.output_width, r.output_height, "
                "t.config AS template_config, "
                "i.processed_url, "
                "u.plan AS user_plan "
                "FROM renders r "
                "JOIN templates t ON t.id = r.template_id "
                "JOIN images i ON i.id = r.image_id "
                "JOIN users u ON u.id = r.user_id "
                "WHERE r.id = CAST(:render_id AS uuid)"
            ),
            {"render_id": render_id},
        )
        row = result.mappings().fetchone()
        return dict(row) if row else None


def _update_render_status(
    render_id: str,
    *,
    status: str = "rendering",
    output_url: str | None = None,
    error_message: str | None = None,
) -> None:
    """Update render record in PostgreSQL."""
    with _sync_engine.connect() as conn:
        conn.execute(
            text(
                "UPDATE renders SET status = :status, "
                "output_url = :output_url, "
                "error_message = :error_message "
                "WHERE id = CAST(:render_id AS uuid)"
            ),
            {
                "status": status,
                "output_url": output_url,
                "error_message": error_message,
                "render_id": render_id,
            },
        )
        conn.commit()


def render_card_job(render_id: str) -> None:
    """Render a product card using Pillow compositing.

    Called by RQ with job_timeout=60.
    Composites: background + shadow + product image + text areas + decorations.
    Applies watermark for free plan. Saves to MinIO rendered bucket.
    """
    start_time = time.time()

    try:
        # Mark as rendering
        _update_render_status(render_id, status="rendering")

        # Step 1: Fetch all data needed for rendering
        data = _get_render_data(render_id)
        if not data:
            raise ValueError(f"Render record not found: {render_id}")

        overlay = data["overlay_data"]  # Already parsed from JSONB
        config = data["template_config"]  # Template JSON config
        marketplace = data["marketplace"]
        user_plan = data["user_plan"]
        output_w = data["output_width"]
        output_h = data["output_height"]

        logger.info(
            "Rendering card %s (%s %dx%d)", render_id, marketplace, output_w, output_h
        )

        # Step 2: Create base canvas at marketplace dimensions
        canvas = Image.new("RGBA", (output_w, output_h), (255, 255, 255, 255))

        # Step 3: Draw background
        bg = config.get("background", {})
        if bg.get("type") == "gradient":
            # Vertical gradient using numpy for performance
            from_color = _hex_to_rgba(bg.get("from", "#FFFFFF"))
            to_color = _hex_to_rgba(bg.get("to", "#FFFFFF"))
            gradient = np.zeros((output_h, output_w, 4), dtype=np.uint8)
            for ch in range(3):
                gradient[:, :, ch] = np.linspace(
                    from_color[ch], to_color[ch], output_h, dtype=np.uint8
                )[:, np.newaxis]
            gradient[:, :, 3] = 255
            canvas = Image.fromarray(gradient, "RGBA")
        elif bg.get("type") == "solid":
            color = _hex_to_rgba(bg.get("color", "#FFFFFF"))
            canvas = Image.new("RGBA", (output_w, output_h), color)

        # Step 4: Load product image
        product_img = None
        px, py = 0, 0
        processed_url = data["processed_url"]
        if processed_url:
            try:
                response = _minio_client.get_object("processed", processed_url)
                product_bytes = response.read()
                response.close()
                response.release_conn()

                product_img = Image.open(io.BytesIO(product_bytes)).convert("RGBA")

                # Position and resize per overlay_data.product
                prod = overlay.get("product", {})
                px = int(prod.get("x", 0))
                py = int(prod.get("y", 0))
                pw = int(prod.get("width", product_img.width))
                ph = int(prod.get("height", product_img.height))
                rotation = float(prod.get("rotation", 0))

                # Resize product image to target dimensions
                product_img = product_img.resize((pw, ph), Image.LANCZOS)

                # Apply rotation if non-zero
                if abs(rotation) > 0.5:
                    product_img = product_img.rotate(
                        -rotation, expand=True, resample=Image.BICUBIC
                    )
            except Exception as exc:
                logger.warning("Failed to load product image: %s", exc)

        # Step 5: Draw shadow decorations BEFORE product (so shadow is behind)
        decorations = config.get("decorations", [])
        for deco in decorations:
            if deco.get("type") == "shadow" and product_img is not None:
                shadow_offset_x = int(deco.get("offsetX", 0))
                shadow_offset_y = int(deco.get("offsetY", 0))
                shadow_blur = int(deco.get("blur", 10))
                shadow_color = _hex_to_rgba(deco.get("color", "rgba(0,0,0,0.15)"))

                # Create shadow from product silhouette
                shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
                if product_img.mode == "RGBA":
                    alpha_mask = product_img.split()[3]
                    shadow_fill = Image.new("RGBA", product_img.size, shadow_color)
                    shadow_fill.putalpha(alpha_mask)
                    shadow.paste(
                        shadow_fill,
                        (px + shadow_offset_x, py + shadow_offset_y),
                        shadow_fill,
                    )
                shadow = shadow.filter(ImageFilter.GaussianBlur(radius=shadow_blur))
                canvas = Image.alpha_composite(canvas, shadow)

        # Step 6: Composite product image onto canvas
        if product_img is not None:
            canvas.paste(product_img, (px, py), product_img)

        # Step 7: Draw text areas
        draw = ImageDraw.Draw(canvas)

        texts_overlay = overlay.get("texts", [])
        text_areas_config = config.get("text_areas", [])

        # Build a lookup from area_id to config defaults
        ta_config_map = {ta["id"]: ta for ta in text_areas_config}

        for text_item in texts_overlay:
            area_id = text_item.get("area_id", "")
            content = text_item.get("content", "")
            if not content.strip():
                continue

            # Get position from template config (canonical positions)
            ta_cfg = ta_config_map.get(area_id, {})
            tx = int(ta_cfg.get("x", 0))
            ty = int(ta_cfg.get("y", 0))
            tw = int(ta_cfg.get("width", 800))
            t_align = ta_cfg.get("align", "left")

            # Get style from overlay (user overrides)
            font_size = int(
                text_item.get("fontSize", ta_cfg.get("fontSize", 24))
            )
            font_family = text_item.get("fontFamily", "Inter")
            font_weight = text_item.get(
                "fontWeight", ta_cfg.get("fontWeight", "normal")
            )
            text_color = text_item.get("color", ta_cfg.get("color", "#000000"))

            font = _load_font(font_family, font_size, font_weight)
            fill_color = _hex_to_rgba(text_color)[:3]  # RGB for draw.text

            # Calculate text position based on alignment
            bbox = draw.textbbox((0, 0), content, font=font)
            text_w = bbox[2] - bbox[0]

            if t_align == "center":
                tx = tx + (tw - text_w) // 2
            elif t_align == "right":
                tx = tx + tw - text_w

            draw.text((tx, ty), content, fill=fill_color, font=font)

        # Step 8: Draw non-shadow decorations (badges, lines)
        badge_overlay = overlay.get("badge", {})

        for deco in decorations:
            deco_type = deco.get("type")

            if deco_type == "badge" and badge_overlay.get("enabled", True):
                # Draw rounded rectangle badge with text
                bx = int(deco.get("x", 0))
                by = int(deco.get("y", 0))
                bw = int(deco.get("width", 100))
                bh = int(deco.get("height", 40))
                bg_color = _hex_to_rgba(deco.get("bg", "#FF0000"))
                text_color_badge = _hex_to_rgba(deco.get("color", "#FFFFFF"))[:3]
                badge_font_size = int(deco.get("fontSize", 16))
                border_radius = int(deco.get("borderRadius", 0))
                badge_text = badge_overlay.get("text", deco.get("text", ""))

                # Draw rounded rectangle on separate layer
                badge_layer = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
                badge_draw = ImageDraw.Draw(badge_layer)
                badge_draw.rounded_rectangle(
                    [(0, 0), (bw - 1, bh - 1)],
                    radius=border_radius,
                    fill=bg_color,
                )
                # Draw badge text centered
                badge_font = _load_font("Inter", badge_font_size, "bold")
                bbox = badge_draw.textbbox((0, 0), badge_text, font=badge_font)
                tw_b = bbox[2] - bbox[0]
                th_b = bbox[3] - bbox[1]
                badge_draw.text(
                    ((bw - tw_b) // 2, (bh - th_b) // 2),
                    badge_text,
                    fill=text_color_badge,
                    font=badge_font,
                )
                canvas.paste(badge_layer, (bx, by), badge_layer)

            elif deco_type == "line":
                x1 = int(deco.get("x1", 0))
                y1 = int(deco.get("y1", 0))
                x2 = int(deco.get("x2", 0))
                y2 = int(deco.get("y2", 0))
                line_color = _hex_to_rgba(deco.get("color", "#000000"))[:3]
                line_width = int(deco.get("width", 1))
                draw.line(
                    [(x1, y1), (x2, y2)], fill=line_color, width=line_width
                )

        # Step 9: Apply watermark for free plan (per D-04, RNDR-06)
        if user_plan == "free":
            watermark_text = "MarketFoto.ru"
            # ~3% of output width for readable but subtle font size
            wm_font_size = max(int(output_w * 0.03), 14)
            wm_font = _load_font("Inter", wm_font_size, "normal")

            wm_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            wm_draw = ImageDraw.Draw(wm_layer)

            bbox = wm_draw.textbbox((0, 0), watermark_text, font=wm_font)
            wm_w = bbox[2] - bbox[0]
            wm_h = bbox[3] - bbox[1]

            # Bottom-right corner with 20px padding
            wm_x = output_w - wm_w - 20
            wm_y = output_h - wm_h - 20

            # Opacity 0.3 = alpha 77
            wm_draw.text(
                (wm_x, wm_y),
                watermark_text,
                fill=(128, 128, 128, 77),
                font=wm_font,
            )
            canvas = Image.alpha_composite(canvas, wm_layer)

        # Step 10: Convert to RGB for final output (no alpha in final PNG)
        final_image = canvas.convert("RGB")

        # Step 11: Save to bytes
        output_buffer = io.BytesIO()
        final_image.save(output_buffer, format="PNG", optimize=True)
        output_buffer.seek(0)
        png_bytes = output_buffer.getvalue()

        # Step 12: Upload to MinIO rendered bucket (per D-01, RNDR-04)
        user_id = str(data["user_id"])
        output_key = f"{user_id}/{render_id}.png"

        _minio_client.put_object(
            "rendered",
            output_key,
            io.BytesIO(png_bytes),
            len(png_bytes),
            content_type="image/png",
        )

        # Step 13: Update render record with output_url and status=complete
        _update_render_status(render_id, status="complete", output_url=output_key)

        elapsed = int((time.time() - start_time) * 1000)
        logger.info(
            "Render %s complete in %dms (%d bytes)",
            render_id,
            elapsed,
            len(png_bytes),
        )

    except Exception as exc:
        elapsed = int((time.time() - start_time) * 1000)
        error_msg = str(exc)[:500]
        logger.error(
            "Render %s failed after %dms: %s", render_id, elapsed, error_msg
        )

        try:
            _update_render_status(
                render_id, status="failed", error_message=error_msg
            )
        except Exception:
            logger.exception("Failed to update render status to failed")

        raise


# ---------------------------------------------------------------------------
# AI Photoshoot job: Gemini 3.1 Flash Image multimodal generation
# ---------------------------------------------------------------------------

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")


def _update_photoshoot_status(
    render_id: str,
    *,
    status: str,
    output_url: str | None = None,
    error_message: str | None = None,
    processing_time_ms: int | None = None,
) -> None:
    """Update ai_photoshoots record in PostgreSQL (sync)."""
    with _sync_engine.connect() as conn:
        conn.execute(
            text(
                "UPDATE ai_photoshoots SET status = :status, "
                "output_url = :output_url, "
                "error_message = :error_message, "
                "processing_time_ms = :processing_time_ms "
                "WHERE id = CAST(:render_id AS uuid)"
            ),
            {
                "status": status,
                "output_url": output_url,
                "error_message": error_message,
                "processing_time_ms": processing_time_ms,
                "render_id": render_id,
            },
        )
        conn.commit()


def _get_processed_url(image_id: str) -> str | None:
    """Fetch processed_url from images table for the given image."""
    with _sync_engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT processed_url FROM images "
                "WHERE id = CAST(:image_id AS uuid) AND status = 'processed'"
            ),
            {"image_id": image_id},
        )
        row = result.fetchone()
        return row[0] if row else None


def ai_photoshoot_job(
    render_id: str,
    image_id: str,
    user_id: str,
    style: str,
    marketplace: str,
) -> None:
    """Generate AI product photoshoot using Gemini 3.1 Flash Image.

    Called by RQ with job_timeout=120.
    Downloads product image from MinIO, calls Gemini multimodal API,
    saves result to MinIO rendered bucket, updates DB record.
    """
    start_time = time.time()

    try:
        # Mark as generating
        _update_photoshoot_status(render_id, status="generating")
        logger.info(
            "AI photoshoot %s: style=%s, marketplace=%s, user=%s",
            render_id, style, marketplace, user_id,
        )

        # Step 1: Get processed image URL from DB
        processed_url = _get_processed_url(image_id)
        if not processed_url:
            raise ValueError(f"Processed image not found for image_id={image_id}")

        # Step 2: Download product image from MinIO
        try:
            response = _minio_client.get_object("processed", processed_url)
            product_bytes = response.read()
            response.close()
            response.release_conn()
        except Exception as exc:
            raise RuntimeError(f"Failed to download product image: {exc}") from exc

        # Step 3: Call Gemini multimodal API
        if not GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY not configured")

        # Set HTTP proxy for Gemini API (Russia is geo-blocked)
        import httpx
        proxy_url = os.environ.get("HTTP_PROXY", "")

        from google import genai
        from google.genai import types as genai_types

        # Style prompts (duplicated from service to avoid importing app modules in worker)
        STYLE_PROMPTS = {
            "studio": (
                "Create a professional studio product photography. "
                "Place this exact product as the hero subject on a clean, soft gradient background. "
                "Professional three-point studio lighting with key light from the upper-left, "
                "fill light from the right, and subtle rim light. "
                "Soft shadows beneath the product. "
                "The product should be the clear focal point, centered, taking up 60% of the frame. "
                "Resolution: {width}x{height}px. "
                "Style: high-end commercial product photography, FMCG brand campaign, ultra-realistic. "
                "IMPORTANT: Use the uploaded product image exactly as the product "
                "without modifying its design, packaging, label, or color."
            ),
            "lifestyle": (
                "Create an ultra-realistic lifestyle product advertisement. "
                "Place this exact product as the hero in a carefully styled scene "
                "that matches its category. "
                "Add complementary props and a themed background that enhances the product's appeal. "
                "Soft natural lighting with golden hour warmth. "
                "Shallow depth of field with the product perfectly sharp. "
                "The product takes up 40-50% of the frame. "
                "Background should be harmonious and not distract from the product. "
                "Resolution: {width}x{height}px. "
                "Style: premium lifestyle photography, Instagram-worthy, aspirational. "
                "IMPORTANT: Use the uploaded product image exactly as the product "
                "without modifying its design, packaging, label, or color."
            ),
            "minimal": (
                "Create a minimalist product photograph. "
                "Place this exact product centered on a pure white background. "
                "Add only a subtle soft shadow beneath the product for depth. "
                "Clean, bright, even lighting. No props, no distractions. "
                "The product should occupy 50-60% of the frame. "
                "Resolution: {width}x{height}px. "
                "Style: Apple-like product photography, ultra-clean, white space, premium minimalism. "
                "IMPORTANT: Use the uploaded product image exactly as the product "
                "without modifying its design, packaging, label, or color."
            ),
            "creative": (
                "Create a creative, eye-catching product advertisement. "
                "Place this exact product in a dynamic, artistic composition with bold colors, "
                "geometric shapes, or abstract elements that complement the product's color palette. "
                "Dramatic lighting with vibrant color accents. "
                "Flying elements, splashes, or particles related to the product category. "
                "The product is the clear hero, taking 40% of the frame. "
                "Resolution: {width}x{height}px. "
                "Style: high-end advertising campaign, bold and memorable, "
                "award-winning creative direction. "
                "IMPORTANT: Use the uploaded product image exactly as the product "
                "without modifying its design, packaging, label, or color."
            ),
            "infographic": (
                "Create a professional product infographic card. "
                "Place this exact product on the left side (40% of width) "
                "on a clean light gradient background. "
                "On the right side, add space for text overlays (will be added separately). "
                "Add subtle decorative lines connecting the product to the text area. "
                "Clean, professional look suitable for marketplace listing. "
                "Resolution: {width}x{height}px. "
                "Style: e-commerce product infographic, Wildberries/Ozon marketplace card. "
                "IMPORTANT: Use the uploaded product image exactly as the product "
                "without modifying its design, packaging, label, or color."
            ),
        }

        MP_DIMS = {
            "wb": (900, 1200, "3:4"),
            "ozon": (1200, 1200, "1:1"),
            "ym": (800, 800, "1:1"),
        }

        width, height, aspect_ratio = MP_DIMS[marketplace]
        prompt = STYLE_PROMPTS[style].format(width=width, height=height)

        # Load product image as PIL
        product_image = Image.open(io.BytesIO(product_bytes))

        # Call Gemini — pass PIL Image directly (SDK auto-converts to Blob)
        # Use HTTP proxy to bypass geo-block (Russia → Finland proxy)
        http_options = {}
        if proxy_url:
            http_options = {"api_version": "v1beta"}
            os.environ["HTTPS_PROXY"] = proxy_url
            os.environ["HTTP_PROXY"] = proxy_url
        client = genai.Client(api_key=GEMINI_API_KEY)
        gemini_response = client.models.generate_content(
            model="gemini-3.1-flash-image-preview",
            contents=[product_image, prompt],
            config=genai_types.GenerateContentConfig(
                response_modalities=["IMAGE"],
                image_config=genai_types.ImageConfig(
                    aspect_ratio=aspect_ratio,
                ),
            ),
        )

        # Extract image bytes from response
        result_bytes = None
        for part in gemini_response.parts:
            if part.inline_data:
                result_bytes = part.inline_data.data
                break

        if result_bytes is None:
            raise RuntimeError("Gemini did not return an image")

        # Step 4: Upload result to MinIO rendered bucket
        output_key = f"{user_id}/ai_{render_id}.png"
        _minio_client.put_object(
            "rendered",
            output_key,
            io.BytesIO(result_bytes),
            len(result_bytes),
            content_type="image/png",
        )

        # Step 5: Update DB with success
        processing_time_ms = int((time.time() - start_time) * 1000)
        _update_photoshoot_status(
            render_id,
            status="complete",
            output_url=output_key,
            processing_time_ms=processing_time_ms,
        )

        logger.info(
            "AI photoshoot %s complete in %dms (%d bytes)",
            render_id,
            processing_time_ms,
            len(result_bytes),
        )

    except Exception as exc:
        elapsed_ms = int((time.time() - start_time) * 1000)
        error_msg = str(exc)[:500]
        logger.error(
            "AI photoshoot %s failed after %dms: %s",
            render_id, elapsed_ms, error_msg,
        )

        try:
            _update_photoshoot_status(
                render_id,
                status="failed",
                error_message=error_msg,
                processing_time_ms=elapsed_ms,
            )
        except Exception:
            logger.exception("Failed to update photoshoot status to failed")

        raise
