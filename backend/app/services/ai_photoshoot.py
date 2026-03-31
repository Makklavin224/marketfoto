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
    "studio": {
        "name": "Студийная съёмка",
        "description": "Профессиональный студийный свет, чистый фон",
        "prompt_template": (
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
    },
    "lifestyle": {
        "name": "Лайфстайл сцена",
        "description": "Товар в стильной жизненной сцене",
        "prompt_template": (
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
    },
    "minimal": {
        "name": "Минимализм",
        "description": "Чистый белый фон, мягкие тени, premium feel",
        "prompt_template": (
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
    },
    "creative": {
        "name": "Креативный",
        "description": "Художественная композиция с эффектами",
        "prompt_template": (
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
    },
    "infographic": {
        "name": "Инфографика",
        "description": "Товар с инфографикой и характеристиками",
        "prompt_template": (
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
        }
        for style_id, style in STYLES.items()
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
