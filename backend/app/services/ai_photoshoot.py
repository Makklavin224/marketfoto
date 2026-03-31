"""
AI Photoshoot Service — Gemini 3.1 Flash Image multimodal generation.

Generates professional product photography by combining:
- The actual product image (PNG with transparent background from rembg)
- A style-specific text prompt (studio, lifestyle, minimal, creative, infographic)

The Gemini model receives BOTH the product image and the prompt,
producing a new image with the product placed in a professional scene.
"""

from __future__ import annotations

import io
import logging
from typing import Any

from google import genai
from google.genai import types
from PIL import Image

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Style presets: each has a Russian-facing name/description and a
# detailed English prompt template for Gemini.
# ---------------------------------------------------------------------------

STYLES: dict[str, dict[str, str]] = {
    "hero": {
        "name": "Главное фото",
        "description": "Чистый студийный снимок — товар крупно, профессиональный свет",
        "emoji": "📸",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create a clean hero product photograph for a marketplace listing. "
            "Place the product perfectly centered, taking up 60-70% of the frame. "
            "Background: smooth gradient from the product's complementary color (lighter at top, "
            "slightly darker at bottom) — NOT pure white, use a subtle brand-appropriate tone. "
            "Lighting: professional three-point setup — key light from upper-left at 45 degrees, "
            "fill light from right at 30%, subtle rim light from behind for clean edge separation. "
            "Soft diffused shadow directly beneath the product on a reflective surface. "
            "Do NOT add any text, labels, badges, props, or decorative elements. "
            "Do NOT add any extra products or objects — only the uploaded product. "
            "The image must look like a professional studio photograph taken with a 100mm macro lens. "
            "Resolution: {width}x{height}px. "
            "Style: high-end commercial product photography, Apple-style clean aesthetic, "
            "like Студия TOPSEL marketplace hero shots."
        ),
    },
    "lifestyle": {
        "name": "Лайфстайл сцена",
        "description": "Товар в красивой сцене с реквизитом — как дома у покупателя",
        "emoji": "🏡",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create a warm, aspirational lifestyle product photograph. "
            "Place the product as the hero (40-50% of the frame) in a carefully styled real-world scene. "
            "Add 2-3 complementary props that match the product's category: "
            "cosmetics — bathroom shelf with candle and towel; food — kitchen counter with cutting board; "
            "electronics — clean desk with plant; clothing — styled wardrobe corner. "
            "The scene should look like the product is already in the buyer's home — warm, inviting, lived-in. "
            "Lighting: soft natural golden-hour light from a window, warm color temperature (3500K). "
            "Shallow depth of field — product tack-sharp, background softly blurred (f/2.8 bokeh). "
            "Do NOT add any text overlays or badges. Do NOT include other branded products. "
            "Resolution: {width}x{height}px. "
            "Style: premium lifestyle editorial photography, Instagram-worthy, like da_omka styled shots."
        ),
    },
    "creative": {
        "name": "Креативная съёмка",
        "description": "Яркая арт-композиция — летающие элементы, динамика, wow-эффект",
        "emoji": "🎨",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create a bold, eye-catching creative product advertisement that stops the scroll. "
            "Place the product dynamically (40-50% of the frame), slightly tilted or at a dynamic angle. "
            "Add dramatic visual elements: flying ingredients/particles related to the product, "
            "bold color splashes or swirls matching the product's palette, geometric shapes, "
            "motion blur trails, energy lines, or liquid/powder explosions. "
            "Lighting: dramatic side lighting with vivid colored rim lights. "
            "The composition should feel like a frozen moment of action — dynamic, energetic, bold. "
            "Color palette: vibrant, saturated, contrasting with the product colors. "
            "Do NOT add any text overlays or badges. "
            "Do NOT add other products — only the uploaded product plus abstract/creative elements. "
            "Resolution: {width}x{height}px. "
            "Style: award-winning creative advertising, like Chili's chips with flying elements "
            "or protein bar with chocolate swirl explosion."
        ),
    },
    "closeup": {
        "name": "Макро-детали",
        "description": "Крупные планы качества — текстуры, швы, материалы",
        "emoji": "🔍",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create a detail showcase photograph highlighting the product's quality and craftsmanship. "
            "Compose as a 2x2 grid layout with thin white divider lines between cells: "
            "Top-left cell: full product shot at a slight angle showing overall form. "
            "Top-right cell: extreme macro close-up of the most impressive texture or material detail. "
            "Bottom-left cell: close-up of a functional detail — button, clasp, label, mechanism, seam. "
            "Bottom-right cell: another macro angle showing surface finish, stitching, or internal quality. "
            "Each cell has clean, consistent lighting — professional macro photography setup. "
            "Sharp focus on textures, shallow depth of field within each cell. "
            "Background: clean neutral gray or white within each cell. "
            "Resolution: {width}x{height}px. "
            "Style: luxury product detail photography, quality showcase, premium craftsmanship highlight."
        ),
    },
    "ingredients": {
        "name": "С ингредиентами",
        "description": "Товар с ключевыми ингредиентами или составляющими",
        "emoji": "🌿",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create a product photograph surrounded by its key ingredients or related items. "
            "Place the product in the center (40-45% of the frame). "
            "Artfully arrange around it 4-6 photogenic items related to what the product contains or does: "
            "cosmetics — fresh flowers, herbs, essential oil droplets, natural extracts; "
            "food — raw ingredients, spices, fresh produce cut to show freshness; "
            "electronics — visual representations of use cases; "
            "supplements — natural herbs, fruits, vitamin-rich foods. "
            "Some ingredients cut in half to show freshness and interior. "
            "Lighting: soft, even diffused lighting from above. Natural, organic feel. "
            "Color palette: harmonized with the product and ingredients — earthy, fresh tones. "
            "Do NOT add any text overlays. "
            "Resolution: {width}x{height}px. "
            "Style: like Anua or The Ordinary beauty ads — product hero surrounded by its ingredient story."
        ),
    },
    "white_clean": {
        "name": "Белый фон",
        "description": "Чисто белый фон — стандарт маркетплейса, обязательная карточка",
        "emoji": "⬜",
        "prompt_template": (
            "Use the uploaded product image exactly as the main product — do not modify its design, "
            "packaging, label, colors, or proportions. "
            "Create an ultra-clean product photograph on a pure white background. "
            "Place the product perfectly centered, taking up 65-75% of the frame. "
            "Background: pure white (#FFFFFF), seamless, no visible horizon line. "
            "Only a very subtle, soft contact shadow directly beneath the product for grounding. "
            "Lighting: bright, even, diffused studio lighting from all sides — no harsh shadows, "
            "no dark areas, no colored reflections. The product should be evenly lit. "
            "Do NOT add any text, badges, props, decorations, or additional objects. "
            "Do NOT add any colored backgrounds, gradients, or patterns. "
            "The result must be suitable for mandatory marketplace white-background requirement. "
            "Resolution: {width}x{height}px. "
            "Style: standard e-commerce white background photography, like Amazon/Ozon mandatory first image."
        ),
    },
}

# ---------------------------------------------------------------------------
# Card Series presets — generate multiple cards in one go
# ---------------------------------------------------------------------------

SERIES_PRESETS: dict[str, dict[str, Any]] = {
    "wb_full": {
        "name": "WB Полный комплект",
        "description": "5 карточек для Wildberries: главное фото, лайфстайл, креатив, макро-детали, белый фон",
        "card_count": 5,
        "styles": ["hero", "lifestyle", "creative", "closeup", "white_clean"],
    },
    "ozon_premium": {
        "name": "Ozon Премиум",
        "description": "4 карточки для Ozon: главное фото, лайфстайл, ингредиенты, белый фон",
        "card_count": 4,
        "styles": ["hero", "lifestyle", "ingredients", "white_clean"],
    },
    "quick_start": {
        "name": "Быстрый старт",
        "description": "3 карточки на старт: главное фото, лайфстайл, белый фон",
        "card_count": 3,
        "styles": ["hero", "lifestyle", "white_clean"],
    },
}

# Marketplace dimensions: (width, height, aspect_ratio_string)
MARKETPLACE_DIMENSIONS: dict[str, tuple[int, int, str]] = {
    "wb": (900, 1200, "3:4"),
    "ozon": (1200, 1200, "1:1"),
    "ym": (800, 800, "1:1"),
}


def get_styles_list() -> list[dict[str, str]]:
    """Return style presets as a list for the frontend."""
    return [
        {
            "id": style_id,
            "name": style["name"],
            "description": style["description"],
            "emoji": style.get("emoji", "🖼️"),
        }
        for style_id, style in STYLES.items()
    ]


def get_series_list() -> list[dict[str, Any]]:
    """Return series presets as a list for the frontend."""
    return [
        {
            "id": series_id,
            "name": series["name"],
            "description": series["description"],
            "card_count": series["card_count"],
            "styles": series["styles"],
        }
        for series_id, series in SERIES_PRESETS.items()
    ]


def build_prompt(style: str, marketplace: str) -> str:
    """Build the full prompt from style template + marketplace dimensions."""
    if style not in STYLES:
        raise ValueError(f"Unknown style: {style}")
    if marketplace not in MARKETPLACE_DIMENSIONS:
        raise ValueError(f"Unknown marketplace: {marketplace}")

    width, height, _ = MARKETPLACE_DIMENSIONS[marketplace]
    template = STYLES[style]["prompt_template"]
    return template.format(width=width, height=height)


def build_prompt_with_product_info(
    style: str,
    marketplace: str,
    product_info: dict | None = None,
) -> str:
    """Build prompt with optional product info appended."""
    prompt = build_prompt(style, marketplace)

    if product_info:
        title = product_info.get("title", "")
        features = product_info.get("features", [])
        badge = product_info.get("badge", "")

        extras = []
        if title:
            extras.append(f"Product name: {title}.")
        if features:
            extras.append(f"Key features: {', '.join(features)}.")
        if badge:
            extras.append(f"Badge/label on the image: {badge}.")

        if extras:
            prompt += (
                "\n\nAdditional product context: "
                + " ".join(extras)
                + " Include text overlays on the image showing the product name "
                "and features in clean, readable Russian typography."
            )

    return prompt


def generate_photoshoot_sync(
    product_image_bytes: bytes,
    style: str,
    marketplace: str,
) -> bytes:
    """Generate AI product photoshoot (synchronous — for RQ worker).

    Args:
        product_image_bytes: PNG bytes of the product with transparent background.
        style: One of STYLES keys.
        marketplace: One of MARKETPLACE_DIMENSIONS keys.

    Returns:
        Generated image bytes (PNG).
    """
    prompt = build_prompt(style, marketplace)
    _, _, aspect_ratio = MARKETPLACE_DIMENSIONS[marketplace]

    # Load product image
    product_image = Image.open(io.BytesIO(product_image_bytes))

    # Call Gemini with multimodal input: image + text
    client = genai.Client(api_key=settings.gemini_api_key)

    logger.info(
        "Calling Gemini for AI photoshoot: style=%s, marketplace=%s, aspect=%s",
        style,
        marketplace,
        aspect_ratio,
    )

    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=[
            types.Part.from_image(product_image),
            types.Part.from_text(prompt),
        ],
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
            ),
        ),
    )

    # Extract image data from response
    for part in response.parts:
        if part.inline_data:
            return part.inline_data.data

    raise ValueError("Gemini did not return an image")
