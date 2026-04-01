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
        "name": "Обложка",
        "description": "Продающая карточка — тёмный фон, товар крупно, плашки с преимуществами",
        "emoji": "📸",
        "prompt_template": (
            "Профессиональное коммерческое макро-фото для маркетплейса. "
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Создай продающую карточку маркетплейса: центр — крупный товар (40-50% кадра) "
            "с мягкой падающей тенью (drop shadow), слегка под углом 5 градусов. "
            "Фон — глубокий тёмный (#0D1117), комплементарный цвету товара, "
            "с мягким свечением по краям. "
            "Контровое освещение создаёт светящийся контур вокруг товара. "
            "Высокий контраст, чистая композиция. "
            "Разрешение: {width}x{height}px. "
            "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        ),
    },
    "lifestyle": {
        "name": "Лайфстайл сцена",
        "description": "Товар в реальной сцене с тёмным оверлеем и текстовыми элементами",
        "emoji": "🏡",
        "prompt_template": (
            "Кинематографический рекламный кадр для маркетплейса. "
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Помести товар в стильную реальную сцену (ванная/кухня/стол — по типу товара) "
            "с тёмным полупрозрачным оверлеем поверх фотографии для контраста текста. "
            "Глубина резкости — товар резкий, фон мягко размыт. "
            "Тёплое боковое освещение, атмосфера уюта. "
            "Реалистичные отражения, блики на поверхности товара. "
            "Разрешение: {width}x{height}px. "
            "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        ),
    },
    "creative": {
        "name": "Креативная съёмка",
        "description": "Левитация, летающие элементы, тёмный фон с неоновым свечением",
        "emoji": "🎨",
        "prompt_template": (
            "Рекламная фотография с элементами левитации для маркетплейса. "
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Товар парит в воздухе на тёмном фоне (#0D1117) с ярким неоновым свечением. "
            "Вокруг летают тематические элементы — брызги, частицы, ингредиенты. "
            "Яркое драматичное контровое освещение с цветными источниками "
            "реалистично отражается на гранях объекта. "
            "Замороженный момент действия — энергия и динамика. "
            "Разрешение: {width}x{height}px. "
            "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        ),
    },
    "closeup": {
        "name": "Макро-детали",
        "description": "2x2 сетка крупных планов — текстуры, швы, материалы, тёмный фон",
        "emoji": "🔍",
        "prompt_template": (
            "Используй загруженное фото продукта как единственный источник "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Создай серию из 4 кадров в формате 2x2 с тонкими белыми разделителями: "
            "1. Общий вид спереди — товар целиком. "
            "2. Детали/текстура крупно — самая впечатляющая деталь. "
            "3. Вид сбоку/под углом — показать объём и форму. "
            "4. Макро-кадр с акцентом на качество материала или механизм. "
            "Тёмный фон (#1C1C1E) в каждой ячейке. "
            "Каждая ячейка подписана белым текстом — что именно показано. "
            "Единообразное контровое освещение, резкий фокус. "
            "Разрешение: {width}x{height}px. "
            "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        ),
    },
    "ingredients": {
        "name": "С ингредиентами",
        "description": "Товар + ингредиенты вокруг, тёмный фон, подписи на плашках",
        "emoji": "🌿",
        "prompt_template": (
            "Профессиональное коммерческое макро-фото для маркетплейса. "
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Поставь товар в центр (40-45% кадра) с мягкой тенью. "
            "Тёмный фон (#2C1810) с тёплым свечением. "
            "Вокруг красиво разложены 4-6 ингредиентов или компонентов, "
            "связанных с товаром. Каждый ингредиент подписан на полупрозрачной плашке. "
            "Некоторые разрезаны пополам — свежесть и натуральность. "
            "Мягкое контровое освещение сверху. "
            "Разрешение: {width}x{height}px. "
            "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        ),
    },
    "white_clean": {
        "name": "Белый фон",
        "description": "Чисто белый фон — стандарт маркетплейса, обязательная карточка",
        "emoji": "⬜",
        "prompt_template": (
            "Изолируй главный объект на фото и замени текущий фон на бесшовный, "
            "идеально белый студийный фон (RGB 255,255,255). "
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений. "
            "Сохрани точную форму и пропорции объекта. "
            "Товар по центру, занимает 65-75% кадра. "
            "Студийные софтбоксы, мягкие тени только под объектом. "
            "Никаких предметов, текстов, декораций, цветных элементов. "
            "Идеально для каталога маркетплейса. "
            "Разрешение: {width}x{height}px. "
            "8K качество."
        ),
    },
}

# ---------------------------------------------------------------------------
# Card Series presets — generate multiple cards in one go
# ---------------------------------------------------------------------------

SERIES_PRESETS: dict[str, dict[str, Any]] = {
    "wb_full": {
        "name": "WB Полный комплект",
        "description": "5 карточек для Wildberries: обложка, преимущества, применение, характеристики, белый фон",
        "card_count": 5,
        "styles": ["hero", "lifestyle", "creative", "closeup", "white_clean"],
        "slide_types": ["cover", "benefits", "use_cases", "specs", "white_clean"],
    },
    "ozon_premium": {
        "name": "Ozon Премиум",
        "description": "4 карточки для Ozon: обложка, преимущества, инструкция, белый фон",
        "card_count": 4,
        "styles": ["hero", "lifestyle", "ingredients", "white_clean"],
        "slide_types": ["cover", "benefits", "how_to_use", "white_clean"],
    },
    "quick_start": {
        "name": "Быстрый старт",
        "description": "3 карточки на старт: обложка, преимущества, белый фон",
        "card_count": 3,
        "styles": ["hero", "lifestyle", "white_clean"],
        "slide_types": ["cover", "benefits", "white_clean"],
    },
}

# ---------------------------------------------------------------------------
# Slide-type specific prompt patterns for series generation.
# Each slide type has its own composition rules beyond the base style.
# These are appended to the base prompt when generating series cards.
# ---------------------------------------------------------------------------

SLIDE_TYPE_HINTS: dict[str, str] = {
    "cover": (
        "Это ОБЛОЖКА — главная карточка товара. Максимум текстовых элементов: "
        "название CAPS крупно сверху, ключевые цифры ОГРОМНЫМ шрифтом, "
        "2-3 плашки с иконками, бейдж в углу. "
        "Товар 40-50% кадра с drop shadow."
    ),
    "benefits": (
        "Это слайд ПРЕИМУЩЕСТВА. Товар справа (35% кадра). "
        "Слева — 4-5 строк с иконками и текстом преимуществ, "
        "каждая строка: иконка + короткий текст (2-4 слова). "
        "Тёмный фон. Белый текст."
    ),
    "use_cases": (
        "Это слайд ПРИМЕНЕНИЕ. По кругу или в сетке 2x3 покажи "
        "сценарии использования товара с подписями: "
        "'ВАННАЯ', 'КУХНЯ', 'СТИРКА', 'УБОРКА' и т.д. (по типу товара). "
        "Каждый сценарий в круглой рамке с иконкой. Тёмный фон."
    ),
    "specs": (
        "Это слайд ХАРАКТЕРИСТИКИ. Покажи таблицу/сетку технических "
        "характеристик товара. Каждая строка: параметр + значение. "
        "Ключевые числа крупным шрифтом. Тёмный фон, белый текст."
    ),
    "how_to_use": (
        "Это слайд ИНСТРУКЦИЯ. Покажи 3-5 пронумерованных шагов "
        "использования товара: '1. Откройте...', '2. Нанесите...', '3. Подождите...' "
        "Каждый шаг с номером в круге и кратким описанием. "
        "Тёмный фон, белый текст, номера шагов крупные."
    ),
    "white_clean": (
        "Это слайд БЕЛЫЙ ФОН для каталога. "
        "Чистый белый фон RGB(255,255,255). Никаких текстов и плашек. "
        "Только товар по центру, 65-75% кадра."
    ),
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
    slide_type: str | None = None,
) -> str:
    """Build prompt with optional product info and slide type hints.

    Args:
        style: One of STYLES keys.
        marketplace: One of MARKETPLACE_DIMENSIONS keys.
        product_info: Optional dict with title, features, badge.
        slide_type: Optional slide type for series (cover, benefits, etc.).
    """
    import re

    prompt = build_prompt(style, marketplace)

    # Append slide-type hint if generating as part of a series
    if slide_type and slide_type in SLIDE_TYPE_HINTS:
        prompt += f"\n\n{SLIDE_TYPE_HINTS[slide_type]}"

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
                    f"НАЗВАНИЕ ТОВАРА: Сверху ЗАГЛАВНЫМИ — '{title.upper()}'. "
                    "Белый жирный шрифт 48-72pt.\n"
                )

            if features:
                # Extract numbers for HUGE display
                number_parts = []
                for feat in features:
                    match = re.search(
                        r'(\d+[\+]?)\s*(мл|мг|Вт|шт|кг|г|см|мм|м|л|LED|ч|час\w*|дн\w*|мес\w*|лет|%)',
                        feat,
                    )
                    if match:
                        number_parts.append(
                            f"'{match.group(1)}' с подписью '{match.group(2)}' "
                            f"ОГРОМНЫМ шрифтом 72-96pt"
                        )

                if number_parts:
                    text_section += (
                        "КЛЮЧЕВЫЕ ЦИФРЫ (крупнее названия, 72-96pt): "
                        + "; ".join(number_parts) + "\n"
                    )

                icons = ["⚡", "🛡️", "💧", "✓", "🔥"]
                text_section += "ПРЕИМУЩЕСТВА (полупрозрачные плашки с иконками):\n"
                for i, feat in enumerate(features):
                    icon = icons[i] if i < len(icons) else "✓"
                    text_section += f"  - {icon} '{feat}'\n"

            if badge:
                text_section += (
                    f"БЕЙДЖ: '{badge}' — яркий кружок/лента, верхний правый угол.\n"
                )

            text_section += (
                "Тёмный фон, белая типографика, полупрозрачные плашки. "
                "8K фотореализм, стиль продающей карточки Wildberries/Ozon.\n"
            )

            prompt += text_section

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
