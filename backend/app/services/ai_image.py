"""
AI Image Generation Service — Nano Banana 2 (Gemini 3.1 Flash Image)

Generates:
- Before/after product card examples for landing page
- Template preview images
- Marketing visuals
- UI design assets (backgrounds, icons, badges)
"""

import io
import base64
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

from app.config import settings


def _get_client() -> genai.Client:
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def generate_image(
    prompt: str,
    aspect_ratio: str = "3:4",
    resolution: str = "1K",
) -> bytes:
    """Generate an image from text prompt using Nano Banana 2."""
    client = _get_client()

    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=aspect_ratio,
                output_image_resolution=resolution,
            ),
        ),
    )

    for part in response.parts:
        if part.inline_data:
            return part.inline_data.data

    raise ValueError("No image generated")


async def generate_product_card_example(
    product_description: str,
    marketplace: str = "wb",
) -> dict[str, bytes]:
    """Generate before/after example for landing page.

    Returns dict with 'before' (phone photo) and 'after' (professional card) images.
    """
    dimensions = {
        "wb": ("900x1200", "3:4"),
        "ozon": ("1200x1200", "1:1"),
        "ym": ("800x800", "1:1"),
    }
    size, ratio = dimensions.get(marketplace, ("900x1200", "3:4"))

    before_prompt = (
        f"A realistic amateur phone photo of {product_description} taken on a kitchen table. "
        "Poor lighting, cluttered background, slightly blurry. "
        "Looks like a typical seller's photo from their phone camera. No text overlays."
    )

    after_prompt = (
        f"A professional e-commerce product card for {product_description}. "
        f"Clean white background, perfect lighting, product centered. "
        f"Professional infographic style with Russian text labels showing features. "
        f"Size {size} pixels, marketplace-ready product photography. "
        "High quality, studio lighting, clean composition."
    )

    before_data = await generate_image(before_prompt, aspect_ratio=ratio)
    after_data = await generate_image(after_prompt, aspect_ratio=ratio)

    return {"before": before_data, "after": after_data}


async def generate_template_preview(
    template_name: str,
    category: str,
    product: str = "стильная термокружка",
) -> bytes:
    """Generate a preview image for a template card."""
    style_map = {
        "white_bg": "Clean white background, product centered, minimal design",
        "infographic": "Product on left, feature list with icons on right, gradient background",
        "lifestyle": "Product with soft shadows on warm beige background, elegant typography",
        "collage": "Two angles of the product side by side on white background",
    }

    style = style_map.get(category, "Professional product card")

    prompt = (
        f"Professional marketplace product card template: '{template_name}'. "
        f"Product: {product}. Style: {style}. "
        "Russian text labels. 900x1200px, high quality, e-commerce design. "
        "Clean, modern, professional. Ready for Wildberries/Ozon marketplace."
    )

    return await generate_image(prompt, aspect_ratio="3:4")


async def generate_design_asset(
    asset_type: str,
    description: str,
    aspect_ratio: str = "1:1",
) -> bytes:
    """Generate UI design assets — backgrounds, patterns, icons, badges.

    asset_type: 'background', 'badge', 'icon', 'pattern', 'hero'
    """
    type_prompts = {
        "background": f"Seamless tileable pattern or gradient background: {description}. Clean, modern, subtle.",
        "badge": f"E-commerce product badge or label: {description}. Russian text, bold, eye-catching. PNG with transparency.",
        "icon": f"Modern flat icon: {description}. Simple, clean lines, suitable for web UI. SVG style.",
        "pattern": f"Seamless decorative pattern: {description}. Subtle, elegant, for product card backgrounds.",
        "hero": f"Hero section illustration for a web app: {description}. Modern, clean, tech-style illustration.",
    }

    prompt = type_prompts.get(asset_type, f"Design asset: {description}")

    return await generate_image(prompt, aspect_ratio=aspect_ratio)
