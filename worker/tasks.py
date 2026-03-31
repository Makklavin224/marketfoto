"""RQ worker jobs: background removal via Gemini + AI photoshoot generation.

All jobs are SYNCHRONOUS (RQ forks a subprocess for each).
Do NOT use async/await anywhere in this file.

Background removal: uses Gemini API (lightweight HTTP call, no local ML model).
AI Photoshoot: uses Gemini 3.1 Flash Image with AI Director prompts.
Both go through HTTP proxy to bypass Russia geo-block.
"""

from __future__ import annotations

import io
import logging
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from PIL import Image
from minio import Minio
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

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

        # Step 4: Remove background via Gemini API (lightweight, no local ML model)
        try:
            from google import genai
            from google.genai import types as genai_types

            proxy_url = os.environ.get("HTTP_PROXY", "")
            if proxy_url:
                os.environ["HTTPS_PROXY"] = proxy_url

            api_key = os.environ.get("GEMINI_API_KEY", "")
            if not api_key:
                raise RuntimeError("GEMINI_API_KEY not configured")

            input_image = Image.open(io.BytesIO(original_bytes)).convert("RGBA")
            client = genai.Client(api_key=api_key)

            bg_response = client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[
                    input_image,
                    "Remove the background from this product image completely. "
                    "Return ONLY the product with a fully transparent background (PNG with alpha channel). "
                    "Keep the product exactly as is — do not modify its shape, colors, labels, or proportions. "
                    "Clean edges, no artifacts, no remnants of the original background."
                ],
                config=genai_types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )

            result_image = None
            for part in bg_response.parts:
                if part.inline_data:
                    result_image = Image.open(io.BytesIO(part.inline_data.data)).convert("RGBA")
                    break

            if result_image is None:
                raise RuntimeError("Gemini returned no image for background removal")

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
# AI Photoshoot job: Two-stage generation pipeline
#   Stage 1: AI Director (Gemini 2.5 Flash TEXT) — analyzes product, creates
#            custom scene prompt (~$0.001, ~3-5s)
#   Stage 2: AI Photographer (Gemini 3.1 Flash Image) — generates the image
#            using the custom prompt (~$0.067, ~30-60s)
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


# ---------------------------------------------------------------------------
# Fallback style prompts — used when AI Director is unavailable
# ---------------------------------------------------------------------------

_FALLBACK_STYLE_PROMPTS = {
    "hero": (
        "Профессиональное коммерческое макро-фото для маркетплейса. "
        "Используй загруженное фото продукта как единственный Референс Объекта "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Поставь объект на гладкую поверхность (мрамор или матовый камень). "
        "Вокруг разложены 2-3 тематических предмета, дополняющих товар. "
        "Мягкий, естественный утренний свет (golden hour), контровое освещение, "
        "создающее блики на гранях объекта. Очень высокая детализация. "
        "Товар занимает 60-70% кадра, по центру. "
        "Разрешение: {width}x{height}px. "
        "Фотореалистичное коммерческое фото, 8K качество."
    ),
    "lifestyle": (
        "Кинематографический кадр, рекламное фото для маркетплейса. "
        "Используй загруженное фото продукта как единственный Референс Объекта "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Помести товар в стильную реальную сцену — уютный интерьер, кухонный стол "
        "или ванная комната (в зависимости от типа товара). "
        "Добавь 2-3 подходящих предмета для атмосферы. "
        "Глубина резкости — товар резкий, фон мягко размыт. "
        "Тёплое естественное освещение из окна (golden hour). "
        "Атмосфера уюта и комфорта. Реалистичные отражения, блики. "
        "Разрешение: {width}x{height}px. "
        "8K коммерческое фото."
    ),
    "creative": (
        "Рекламная фотография с элементами левитации для маркетплейса. "
        "Используй загруженное фото продукта как единственный Референс Объекта "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Товар парит в воздухе на ярком, контрастном фоне. "
        "Вокруг летают тематические элементы — брызги, частицы, ингредиенты, "
        "цветные всплески. "
        "Яркое драматичное боковое освещение с цветными контровыми источниками "
        "реалистично отражается на гранях объекта. "
        "Атмосфера энергии и динамики. Замороженный момент действия. "
        "Разрешение: {width}x{height}px. "
        "8K коммерческое фото."
    ),
    "closeup": (
        "Используй загруженное фото продукта как единственный источник "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Создай серию из 4 кадров в формате 2x2 с тонкими белыми разделителями: "
        "1. Общий вид спереди — товар целиком. "
        "2. Детали/текстура крупно — самая впечатляющая деталь. "
        "3. Вид сбоку/под углом — показать объём и форму. "
        "4. Макро-кадр с акцентом на качество материала или механизм. "
        "Каждый кадр — единообразный стиль освещения, чистый фон. "
        "Профессиональная макросъёмка, резкий фокус на текстурах. "
        "Разрешение: {width}x{height}px. "
        "Последовательный внешний вид, 8K качество."
    ),
    "ingredients": (
        "Профессиональное коммерческое макро-фото для маркетплейса. "
        "Используй загруженное фото продукта как единственный Референс Объекта "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Поставь товар в центр (40-45% кадра). "
        "Вокруг красиво разложены 4-6 ингредиентов или компонентов, "
        "связанных с товаром. Некоторые разрезаны пополам, чтобы показать свежесть. "
        "Мягкое рассеянное освещение сверху. Натуральная, органическая атмосфера. "
        "Цветовая палитра гармонирует с товаром — свежие, природные тона. "
        "Разрешение: {width}x{height}px. "
        "8K коммерческое фото."
    ),
    "white_clean": (
        "Изолируй главный объект на фото и замени текущий фон на бесшовный, "
        "идеально белый студийный фон (RGB 255,255,255). "
        "Используй загруженное фото продукта как единственный Референс Объекта "
        "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
        "Сохрани точную форму и пропорции объекта. "
        "Товар по центру, занимает 65-75% кадра. "
        "Студийные софтбоксы, мягкие тени только под объектом. "
        "Никаких предметов, текстов, декораций, цветных элементов. "
        "Идеально для каталога маркетплейса. "
        "Разрешение: {width}x{height}px. "
        "8K качество."
    ),
}


def _call_ai_director(
    product_bytes: bytes,
    style: str,
    marketplace: str,
    product_info: dict | None,
) -> str | None:
    """Stage 1: Call AI Director to analyze product and create custom prompt.

    Returns the custom prompt string, or None if Director is unavailable
    (in which case the worker falls back to the static style template).
    """
    try:
        # In Docker, backend/app is copied to /app/app with PYTHONPATH=/app
        from app.services.ai_director import analyze_product_and_create_prompt

        director_result = analyze_product_and_create_prompt(
            product_image_bytes=product_bytes,
            style=style,
            marketplace=marketplace,
            product_info=product_info,
        )

        # If Director returned a fallback (empty prompt), signal to use template
        if director_result.get("_fallback") or not director_result.get("prompt"):
            logger.info("AI Director returned fallback, will use static template")
            return None

        prompt = director_result["prompt"]
        logger.info(
            "AI Director created custom prompt: type=%s, concept=%s, len=%d",
            director_result.get("product_type", "?"),
            director_result.get("scene_concept", "?")[:60],
            len(prompt),
        )
        return prompt

    except ImportError:
        logger.warning("AI Director module not available (import failed), using template")
        return None
    except Exception as e:
        logger.warning("AI Director failed: %s — falling back to template", str(e)[:200])
        return None


def ai_photoshoot_job(
    render_id: str,
    image_id: str,
    user_id: str,
    style: str,
    marketplace: str,
    product_info: dict | None = None,
) -> None:
    """Generate AI product photoshoot using two-stage pipeline.

    Stage 1: AI Director (Gemini 2.5 Flash TEXT) analyzes the product image
             and creates a custom scene-specific prompt. (~3-5s, ~$0.001)
    Stage 2: AI Photographer (Gemini 3.1 Flash Image) generates the image
             using the custom prompt from Stage 1. (~30-60s, ~$0.067)

    Called by RQ with job_timeout=300.
    Downloads product image from MinIO, runs both stages, saves result
    to MinIO rendered bucket, updates DB record.

    Args:
        product_info: Optional dict with keys: title, features, badge.
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
        proxy_url = os.environ.get("HTTP_PROXY", "")

        from google import genai
        from google.genai import types as genai_types

        MP_DIMS = {
            "wb": (900, 1200, "3:4"),
            "ozon": (1200, 1200, "1:1"),
            "ym": (800, 800, "1:1"),
        }

        width, height, aspect_ratio = MP_DIMS[marketplace]

        # =====================================================================
        # STAGE 1: AI Director — analyze product, create custom prompt
        # =====================================================================
        director_start = time.time()
        custom_prompt = _call_ai_director(
            product_bytes, style, marketplace, product_info,
        )
        director_elapsed = int((time.time() - director_start) * 1000)
        logger.info("AI Director stage took %dms", director_elapsed)

        # Decide which prompt to use
        if custom_prompt:
            prompt = custom_prompt
            logger.info("Using AI Director custom prompt (%d chars)", len(prompt))
        else:
            # Fallback: use static style template (old behavior)
            prompt = _FALLBACK_STYLE_PROMPTS[style].format(width=width, height=height)

            # Append product info as infographic text overlays (proven WB/Ozon format)
            if product_info:
                title = product_info.get("title", "")
                features = product_info.get("features", [])
                badge = product_info.get("badge", "")

                if title or features or badge:
                    text_section = (
                        "\n\nОБЯЗАТЕЛЬНЫЕ ТЕКСТОВЫЕ ЭЛЕМЕНТЫ НА ИЗОБРАЖЕНИИ "
                        "(стиль инфографики Wildberries/Ozon):\n"
                    )

                    if title:
                        text_section += (
                            f"НАЗВАНИЕ ТОВАРА: Крупно сверху или по центру — '{title}'. "
                            "Шрифт жирный, 48-72pt, контрастный к фону. "
                            "Белый текст на тёмном фоне, тёмный текст на светлом фоне.\n"
                        )

                    if features:
                        text_section += (
                            "ПРЕИМУЩЕСТВА в стильных плашках "
                            "(полупрозрачные скруглённые прямоугольники):\n"
                        )
                        positions = [
                            "слева сверху", "справа сверху",
                            "слева снизу", "справа снизу",
                            "по центру снизу",
                        ]
                        for i, feat in enumerate(features):
                            pos = positions[i] if i < len(positions) else "рядом с товаром"
                            text_section += f"  \u2022 '{feat}' — плашка {pos} от товара\n"

                    if badge:
                        text_section += (
                            f"БЕЙДЖ: '{badge}' — яркий цветной бейдж "
                            "(красный/оранжевый круг или лента) в верхнем правом углу. "
                            "Жирный белый текст.\n"
                        )

                    text_section += (
                        "\nВсе тексты на РУССКОМ ЯЗЫКЕ. Чистая типографика, читаемые шрифты, "
                        "стильные плашки с полупрозрачным фоном. Крупные цифры и ключевые слова. "
                        "Стиль: продающая карточка Wildberries/Ozon.\n"
                    )

                    prompt += text_section

            logger.info("Using fallback style template (%d chars)", len(prompt))

        logger.info("AI photoshoot final prompt length: %d chars", len(prompt))

        # =====================================================================
        # STAGE 2: AI Photographer — generate the image
        # =====================================================================

        # Load product image as PIL
        product_image = Image.open(io.BytesIO(product_bytes))

        # Use HTTP proxy to bypass geo-block (Russia -> Finland proxy)
        if proxy_url:
            os.environ["HTTPS_PROXY"] = proxy_url
            os.environ["HTTP_PROXY"] = proxy_url

        # Try models in priority order: 3.1 best quality, then fallbacks
        MODELS = [
            "gemini-3.1-flash-image-preview",  # Best quality
            "gemini-2.5-flash-image",           # Good fallback
            "gemini-3-pro-image-preview",       # Pro quality fallback
        ]
        client = genai.Client(api_key=GEMINI_API_KEY)
        gemini_response = None
        last_error = None

        for model_name in MODELS:
            try:
                logger.info("Trying model: %s", model_name)
                gemini_response = client.models.generate_content(
                    model=model_name,
                    contents=[product_image, prompt],
                    config=genai_types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                        image_config=genai_types.ImageConfig(
                            aspect_ratio=aspect_ratio,
                        ),
                    ),
                )
                if gemini_response and gemini_response.candidates:
                    logger.info("Success with model: %s", model_name)
                    break
            except Exception as e:
                last_error = e
                logger.warning("Model %s failed: %s", model_name, str(e)[:200])
                continue

        if gemini_response is None:
            raise RuntimeError(f"All models failed. Last error: {last_error}")

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
            "AI photoshoot %s complete in %dms (director: %dms, %d bytes)",
            render_id,
            processing_time_ms,
            director_elapsed,
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


# ---------------------------------------------------------------------------
# Parallel series job: generates multiple cards concurrently via ThreadPool
# ---------------------------------------------------------------------------

def ai_photoshoot_series_job(
    series_renders: list[dict],
    image_id: str,
    user_id: str,
    marketplace: str,
) -> None:
    """Generate multiple AI photoshoot cards in parallel using ThreadPoolExecutor.

    Each dict in series_renders has: render_id, style, product_info.
    All Gemini API calls are HTTP-only (no local RAM), so safe to parallelize.
    """
    logger.info(
        "Series job: %d cards for image %s, marketplace %s",
        len(series_renders), image_id, marketplace,
    )

    def _generate_single(render_info: dict) -> str:
        try:
            ai_photoshoot_job(
                render_id=render_info["render_id"],
                image_id=image_id,
                user_id=user_id,
                style=render_info["style"],
                marketplace=marketplace,
                product_info=render_info.get("product_info"),
            )
            return f"{render_info['render_id']}: OK"
        except Exception as e:
            return f"{render_info['render_id']}: FAILED ({str(e)[:100]})"

    max_workers = min(3, len(series_renders))

    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futures = {
            pool.submit(_generate_single, r): r["render_id"]
            for r in series_renders
        }
        for future in as_completed(futures):
            result = future.result()
            logger.info("Series progress: %s", result)

    logger.info("Series complete: %d cards", len(series_renders))
