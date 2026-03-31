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
    "studio_clean": {
        "name": "Студийный чистый",
        "description": "Чистый фон, мягкий свет, Apple-стиль",
        "emoji": "📸",
        "prompt_template": (
            "Create a professional studio product photography. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product centered on a clean white-to-light-gray soft gradient background. "
            "Professional three-point studio lighting: key light from upper-left, fill from right, "
            "subtle rim light for edge separation. Soft diffused shadow beneath the product. "
            "The product is the clear focal point, centered, taking up 60% of the frame. "
            "No props, no distractions — pure product focus. "
            "Resolution: {width}x{height}px. "
            "Style: Apple-style product photography, high-end commercial, ultra-clean, premium."
        ),
    },
    "premium_hero": {
        "name": "Премиальное фото",
        "description": "Драматический свет, фирменные цвета, hero-композиция",
        "emoji": "👑",
        "prompt_template": (
            "Create a dramatic premium hero product shot. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product as the hero with dramatic cinematic lighting from the side. "
            "Background: deep rich color that complements the product's dominant color — "
            "dark tones with subtle gradient. Strong rim light creating a glowing edge. "
            "Slight reflection on a polished dark surface beneath. "
            "The product takes up 50-60% of the frame, slightly angled for dynamism. "
            "Resolution: {width}x{height}px. "
            "Style: premium FMCG brand campaign, like Chili's or Nike hero shots, "
            "award-winning advertising photography."
        ),
    },
    "lifestyle_scene": {
        "name": "Лайфстайл сцена",
        "description": "Товар в стильной сцене с реквизитом",
        "emoji": "✨",
        "prompt_template": (
            "Create an ultra-realistic lifestyle product advertisement. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product as the hero in a carefully styled scene with 2-3 complementary props "
            "that match its category (e.g., plants, fabric textures, food items, sport equipment). "
            "Soft natural lighting with golden hour warmth. Shallow depth of field — product sharp, "
            "background softly blurred. The product takes up 40-50% of the frame. "
            "Background harmonious, styled but not distracting. "
            "Resolution: {width}x{height}px. "
            "Style: premium lifestyle photography, Instagram-worthy, aspirational editorial."
        ),
    },
    "glass_surface": {
        "name": "На стеклянной поверхности",
        "description": "Стеклянная полка, капли воды, отражения",
        "emoji": "💧",
        "prompt_template": (
            "Create a premium product shot on a glass surface. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product on a transparent glass shelf or surface. "
            "Add realistic water droplets on the glass around the product. "
            "Beautiful reflections visible on the glass beneath the product. "
            "Clean gradient background transitioning from light at top to slightly darker at bottom. "
            "Studio lighting from above with side accent creating highlights on glass and water drops. "
            "The product takes up 50% of the frame. "
            "Resolution: {width}x{height}px. "
            "Style: beauty/cosmetics advertising, like MIXIT or L'Oreal product shots on glass."
        ),
    },
    "ingredients": {
        "name": "Ингредиенты",
        "description": "Товар в окружении своих ключевых ингредиентов",
        "emoji": "🍑",
        "prompt_template": (
            "Create a product shot surrounded by its natural ingredients. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product in the center, surrounded by fresh, photogenic ingredients "
            "related to the product (fruits, herbs, flowers, spices, natural elements). "
            "Ingredients are artfully arranged around and slightly behind the product. "
            "Some cut in half to show freshness. Soft even lighting, clean background. "
            "Color palette harmonized with the product and ingredients. "
            "The product takes up 40% of the frame. "
            "Resolution: {width}x{height}px. "
            "Style: like Anua or The Ordinary beauty ads — product hero with ingredient story."
        ),
    },
    "with_model": {
        "name": "С моделью",
        "description": "Модель демонстрирует товар",
        "emoji": "🧑",
        "prompt_template": (
            "Create a beauty/fashion product advertisement with a model. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Show a stylish model naturally holding or using the product. "
            "The model's face and hands should be visible. Natural, confident expression. "
            "Professional beauty lighting — soft and flattering. Clean studio background "
            "with subtle gradient. The product should be clearly visible and prominent, "
            "taking up at least 30% of the frame. Model styled to match the product's brand feel. "
            "Resolution: {width}x{height}px. "
            "Style: beauty/fashion brand campaign, editorial, aspirational."
        ),
    },
    "multi_angle": {
        "name": "Мульти-ракурс",
        "description": "4-6 ракурсов товара в сетке",
        "emoji": "🔄",
        "prompt_template": (
            "Create a multi-angle product display layout. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Show the product from 4-6 different angles arranged in a clean grid layout: "
            "front view, back view, side view, detail close-up, top-down view. "
            "Each angle in its own clean frame with consistent white/light gray background. "
            "Consistent studio lighting across all angles. Thin separator lines between views. "
            "Each view clearly shows a different aspect of the product. "
            "Resolution: {width}x{height}px. "
            "Style: like Ariete or Amazon multi-angle product display, "
            "e-commerce standard multi-view card."
        ),
    },
    "infographic": {
        "name": "Инфографика",
        "description": "Товар + блоки с характеристиками и иконками",
        "emoji": "📊",
        "prompt_template": (
            "Create a professional product infographic card for marketplace. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product on the left or center (40% of width) on a clean background. "
            "Around the product, add 4-6 feature blocks with simple icons and short text labels "
            "connected to relevant parts of the product with thin lines or arrows. "
            "Use a cohesive color scheme that matches the product. "
            "Clean, professional typography. Icons should be simple flat design. "
            "Resolution: {width}x{height}px. "
            "Style: Wildberries/Ozon marketplace infographic card, "
            "like Ariete toaster feature card with icons."
        ),
    },
    "nine_grid": {
        "name": "9-сетка детали",
        "description": "9 ячеек, каждая — крупный план детали",
        "emoji": "🔍",
        "prompt_template": (
            "Create a 3x3 nine-cell detail grid for this product. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Divide the frame into a 3x3 grid (9 equal cells). "
            "Center cell: full product shot. Surrounding 8 cells: extreme close-ups of different "
            "product details — texture, buttons, material, label, stitching, ports, finish. "
            "Each cell has consistent lighting and clean background. "
            "Thin white borders between cells. "
            "Resolution: {width}x{height}px. "
            "Style: like Ariete detailed product grid, premium detail showcase card."
        ),
    },
    "creative_art": {
        "name": "Креативный арт",
        "description": "Яркая художественная композиция, летающие элементы",
        "emoji": "🎨",
        "prompt_template": (
            "Create a creative, eye-catching artistic product advertisement. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product in a dynamic, artistic composition with bold vibrant colors, "
            "geometric shapes, or abstract elements complementing the product's color palette. "
            "Dramatic lighting with vibrant color accents and color splashes. "
            "Flying elements, particles, or splashes related to the product category. "
            "The product is the clear hero, taking 40% of the frame. "
            "Resolution: {width}x{height}px. "
            "Style: award-winning creative advertising campaign, bold and memorable, "
            "eye-catching marketplace card."
        ),
    },
    "storyboard": {
        "name": "Раскадровка",
        "description": "Несколько сцен использования товара",
        "emoji": "🎬",
        "prompt_template": (
            "Create a storyboard-style product card showing the product in use. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Divide the frame into 3-4 panels showing a sequence: "
            "Panel 1: product in packaging or before use. "
            "Panel 2: product being opened/applied/used. "
            "Panel 3: product in action — the key benefit moment. "
            "Panel 4 (if space): the happy result or satisfied user. "
            "Consistent color palette and lighting across all panels. Sequential visual flow. "
            "Resolution: {width}x{height}px. "
            "Style: like Gisou hair oil storyboard or beauty brand step-by-step cards."
        ),
    },
    "detail_texture": {
        "name": "Деталь и текстура",
        "description": "Экстремальные крупные планы качества и материалов",
        "emoji": "🔬",
        "prompt_template": (
            "Create an extreme close-up detail shot of this product. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Show the product at macro-level detail — emphasize texture, material quality, "
            "craftsmanship, stitching, finish, surface detail. "
            "Split composition: one half shows the full product, other half shows extreme close-up "
            "of the most impressive detail or texture. "
            "Professional macro photography lighting — sharp focus on textures. "
            "Resolution: {width}x{height}px. "
            "Style: luxury product detail photography, material quality showcase, "
            "premium craftsmanship highlight."
        ),
    },
    "seasonal": {
        "name": "Сезонная тема",
        "description": "Товар в сезонном контексте (весна, лето, осень, зима)",
        "emoji": "🌸",
        "prompt_template": (
            "Create a seasonal-themed product photograph. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Place the product in a beautiful seasonal setting — choose the most appropriate season "
            "for this product type. Spring: cherry blossoms, fresh green, soft pink light. "
            "Summer: bright sunshine, tropical elements, vibrant colors. "
            "Autumn: warm golden leaves, cozy textures, warm tones. "
            "Winter: snow, frost, cool blue light, holiday elements. "
            "The product takes up 45% of the frame, seasonal elements as backdrop. "
            "Resolution: {width}x{height}px. "
            "Style: seasonal editorial product photography, mood-driven advertising."
        ),
    },
    "minimal_flat": {
        "name": "Минимал flat-lay",
        "description": "Вид сверху, минимальный реквизит",
        "emoji": "⬜",
        "prompt_template": (
            "Create a top-down flat-lay product photograph. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Photograph from directly above (bird's eye view). "
            "Product centered on a clean surface (marble, wood, or solid pastel color). "
            "Minimal 2-3 small complementary props arranged geometrically around the product "
            "(pen, plant leaf, small accessory). Lots of negative space. "
            "Even, shadowless overhead lighting. "
            "The product takes up 35-45% of the frame. "
            "Resolution: {width}x{height}px. "
            "Style: Instagram flat-lay, minimalist editorial, clean aesthetic."
        ),
    },
    "unboxing": {
        "name": "Распаковка",
        "description": "Товар выходит из стильной упаковки",
        "emoji": "📦",
        "prompt_template": (
            "Create a premium unboxing product shot. "
            "Use the uploaded product image exactly as the product — strictly preserve form, "
            "proportions, material, color and proportions unchanged. "
            "Show the product emerging from or sitting in front of a stylish open box or packaging. "
            "Premium packaging feel — tissue paper, ribbon, branded box lid visible. "
            "The product is the hero, partially revealed from the box. "
            "Exciting unboxing moment frozen in time. "
            "Clean background with soft studio lighting. "
            "The product takes up 50% of the frame. "
            "Resolution: {width}x{height}px. "
            "Style: luxury unboxing experience, Apple-like reveal, "
            "premium e-commerce first-impression card."
        ),
    },
}

# ---------------------------------------------------------------------------
# Card Series presets — generate multiple cards in one go
# ---------------------------------------------------------------------------

SERIES_PRESETS: dict[str, dict[str, Any]] = {
    "wb_full": {
        "name": "WB Полный комплект",
        "description": "5 карточек для Wildberries: герой, инфографика, мульти-ракурс, лайфстайл, деталь",
        "card_count": 5,
        "styles": ["premium_hero", "infographic", "multi_angle", "lifestyle_scene", "detail_texture"],
    },
    "ozon_premium": {
        "name": "Ozon Премиум",
        "description": "4 карточки для Ozon: студийная, ингредиенты, инфографика, лайфстайл",
        "card_count": 4,
        "styles": ["studio_clean", "ingredients", "infographic", "lifestyle_scene"],
    },
    "quick_start": {
        "name": "Быстрый старт",
        "description": "3 карточки на старт: герой, инфографика, лайфстайл",
        "card_count": 3,
        "styles": ["premium_hero", "infographic", "lifestyle_scene"],
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
