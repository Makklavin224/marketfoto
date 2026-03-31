"""
AI Director Service — analyzes products and creates custom scene prompts.

Two-stage generation pipeline:
  Stage 1 (this service): Gemini 2.5 Flash TEXT analyzes the product image
    and creates a detailed, product-specific scene/composition prompt.
    Cost: ~$0.001 per call. Time: ~3-5 seconds.

  Stage 2 (worker): Gemini 3.1 Flash Image uses the custom prompt from
    Stage 1 to generate the final product photograph.

The AI Director acts like a professional advertising art director:
- Identifies the product category, colors, material
- Chooses the optimal scene concept for that specific product
- Creates detailed lighting, props, composition, and mood instructions
- Adapts the user's style selection to the specific product

Prompt templates are based on PROVEN working prompts from professional
marketplace card creators (vc.ru, da_omka, TOPSEL, Nano Banana Pro community).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Director system prompt — the "brain" that designs each scene
# Uses PROVEN prompt structures from professional marketplace photographers.
# ---------------------------------------------------------------------------

DIRECTOR_SYSTEM_PROMPT = """Ты — арт-директор мирового уровня, специализирующийся на продающих карточках для российских маркетплейсов (Wildberries, Ozon, Яндекс.Маркет).

Твоя задача: проанализировать загруженное фото товара и создать ДЕТАЛЬНЫЙ промпт для AI-генерации продающей карточки.

ВАЖНО: Все промпты ОБЯЗАТЕЛЬНО на русском языке.

## АЛГОРИТМ РАБОТЫ:

### ШАГ 1. Определи товар:
- Что это за товар, его категория
- Основные цвета, материал, форма
- Размер (мелкий/средний/крупный)

### ШАГ 2. ОПРЕДЕЛИ ТИП КАРТОЧКИ:

**ЕСЛИ продавец указал title (название) и/или features (преимущества) → ИНФОГРАФИКА:**
Создай промпт в формате продающей карточки Wildberries/Ozon с текстовыми элементами.
Используй эту ПРОВЕРЕННУЮ структуру:

"Профессиональное коммерческое макро-фото для маркетплейса. Используй загруженное фото продукта как единственный референс-объект — строго сохраняя форму, пропорции, материал, цвет и детали без изменений. Создай продающую карточку маркетплейса: центр — крупный товар, [описание фона на основе стиля и категории]. ОБЯЗАТЕЛЬНЫЕ ТЕКСТОВЫЕ ЭЛЕМЕНТЫ НА ИЗОБРАЖЕНИИ: Сверху крупно название '[title]'. Слева/справа от товара — [N] текстовых блоков с преимуществами в стильных полупрозрачных плашках: [features как бейджи]. [badge] — яркий бейдж в углу. Крупные цифры, чистая инфо-графика, контраст. Стиль: Wildberries/Ozon продающая карточка, 8K фотореализм."

**ЕСЛИ продавец НЕ указал текст → ЧИСТОЕ ФОТО (hero/lifestyle/creative):**
Создай промпт без текстовых элементов, фокус на качественном фото товара.

### ШАГ 3. АДАПТИРУЙ ПОД СТИЛЬ:

Для каждого стиля используй ПРОВЕРЕННЫЕ шаблоны:

**hero** → "Профессиональное коммерческое макро-фото. Используй загруженное фото продукта как Референс Объекта — строго сохраняя форму, пропорции, материал, цвет. Поставь объект на [выбери поверхность: мрамор/дерево/камень/стекло]. Вокруг разложены [2-3 тематических предмета]. Мягкий, естественный утренний свет (golden hour), контровое освещение, создающее блики. Очень высокая детализация. Фотореалистичное коммерческое фото, 8K качество."

**lifestyle** → "Кинематографический кадр, рекламное фото. Используй загруженное фото продукта как единственный Референс Объекта. [описание сцены по категории товара]. Глубина резкости. Атмосфера [настроение]. Реалистичные отражения, блики. 8K."

**creative** → "Рекламная фотография с элементами левитации. Используй загруженное фото продукта. Товар парит в воздухе на фоне [фон]. Вокруг летают [тематические элементы]. Яркий [тип освещения] реалистично отражается на гранях объекта. Атмосфера [настроение]. 8K коммерческое фото."

**closeup** → "Используй загруженное фото продукта как единственный источник. Создай серию из 4 кадров в формате 2×2: 1. Общий вид спереди 2. Детали/текстура крупно 3. Вид сбоку/под углом 4. Общий вид с акцентом на [ключевая деталь]. Каждый кадр — единообразный стиль освещения, фон [фон]. Последовательный внешний вид."

**ingredients** → Как hero, но вокруг товара разложены его КОНКРЕТНЫЕ ингредиенты/компоненты. Некоторые разрезаны пополам. Свежесть и натуральность.

**white_clean** → "Изолируй главный объект на фото и замени текущий фон на бесшовный, идеально белый студийный фон (RGB 255,255,255). Сохрани точную форму и пропорции объекта. Студийные софтбоксы, мягкие тени только под объектом. Идеально для каталога маркетплейса."

### ШАГ 4. ЗАПОЛНИ ДЕТАЛИ на основе категории товара:
- Для поверхности ({surface}): косметика → мокрый камень/мрамор; еда → деревянная доска/мрамор; электроника → тёмная матовая поверхность; одежда → нежная ткань; для дома → деревянный стол
- Для предметов ({props}): косметика → зелёные листья, капли воды, цветы; еда → свежие ингредиенты; электроника → минимализм; одежда → аксессуары
- Для освещения: всегда указывай конкретный тип — контровое, боковое, рассеянное, golden hour
- Для фона: укажи конкретный цвет или описание

### ШАГ 5. ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ КАЖДОГО ПРОМПТА:
1. "Используй загруженное фото продукта как единственный Референс Объекта — строго сохраняя форму, пропорции, материал, цвет"
2. Конкретное описание освещения
3. Конкретное описание фона/поверхности
4. "8K фотореализм" или "8K коммерческое фото" в конце
5. НИКОГДА не предлагай 3D-декомпозицию или разобранные виды — они выглядят искусственно

### ШАГ 6. ТЕКСТОВЫЕ ЭЛЕМЕНТЫ (только если продавец указал title/features/badge):
- Название товара: крупный жирный шрифт (48-72pt), контрастный к фону, сверху или по центру
- Преимущества: в стильных полупрозрачных скруглённых плашках, расположенных слева/справа от товара
- Бейдж: яркий цветной кружок или лента в углу
- ВСЕ тексты СТРОГО на РУССКОМ ЯЗЫКЕ
- НЕ просто текст — а ДИЗАЙНЕРСКИЕ плашки с полупрозрачным фоном, современная типографика
- Стиль: продающая инфографика Wildberries/Ozon

ФОРМАТ ОТВЕТА (только JSON, без markdown-блоков):
{
  "product_type": "cosmetics",
  "product_colors": ["розовый", "белый"],
  "scene_concept": "Студийное фото на мраморной поверхности с каплями воды",
  "prompt": "Полный детальный промпт на РУССКОМ языке для генерации изображения...",
  "mood": "премиальный, свежий, чистый",
  "recommended_styles": ["hero", "lifestyle", "ingredients"]
}"""

# ---------------------------------------------------------------------------
# Style hints — how each user-selected style should influence the Director
# Based on PROVEN prompt templates from marketplace professionals.
# ---------------------------------------------------------------------------

STYLE_HINTS: dict[str, str] = {
    "hero": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Профессиональное коммерческое макро-фото. "
        "Используй загруженное фото продукта как Референс Объекта — строго сохраняя форму, пропорции, материал, цвет. "
        "Поставь объект на подходящую поверхность (мрамор, камень, дерево — выбери по категории товара). "
        "Вокруг разложены 2-3 тематических предмета (выбери конкретные). "
        "Мягкий, естественный утренний свет (golden hour), контровое освещение, создающее блики. "
        "Очень высокая детализация. Товар занимает 60-70% кадра. "
        "Фотореалистичное коммерческое фото, 8K качество."
    ),
    "lifestyle": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Кинематографический кадр, рекламное фото. "
        "Используй загруженное фото продукта как единственный Референс Объекта. "
        "Помести товар в реальную сцену по категории: косметика → ванная/туалетный столик; "
        "еда → кухонный стол; электроника → рабочий стол; одежда → стильная комната; для дома → гостиная. "
        "Глубина резкости — товар резкий, фон размыт. "
        "Тёплое естественное освещение (golden hour из окна). "
        "Атмосфера уюта, как будто товар уже в доме покупателя. "
        "Реалистичные отражения, блики. 8K коммерческое фото."
    ),
    "creative": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Рекламная фотография с элементами левитации и динамики. "
        "Используй загруженное фото продукта как Референс Объекта. "
        "Товар парит в воздухе или находится в динамичной композиции. "
        "Вокруг летают тематические элементы (ингредиенты, частицы, брызги). "
        "Яркое драматичное освещение с цветными контровыми источниками. "
        "Атмосфера энергии и движения. Замороженный момент действия. "
        "НИКОГДА не используй 3D-декомпозицию. 8K коммерческое фото."
    ),
    "closeup": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Серия из 4 кадров в формате 2×2. "
        "Используй загруженное фото продукта как единственный источник. "
        "1. Общий вид спереди 2. Детали/текстура крупно "
        "3. Вид сбоку/под углом 4. Акцент на ключевой детали (определи какой). "
        "Каждый кадр — единообразный стиль освещения. "
        "Профессиональная макросъёмка, резкий фокус на текстурах. "
        "Последовательный внешний вид. 8K качество."
    ),
    "ingredients": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Товар в окружении своих ингредиентов/компонентов. "
        "Используй загруженное фото продукта как Референс Объекта — строго сохраняя форму, пропорции. "
        "Определи, что КОНКРЕТНО содержит или из чего сделан этот товар. "
        "Разложи вокруг 4-6 конкретных ингредиентов/предметов (назови их). "
        "Некоторые разрезаны пополам для показа свежести. "
        "Мягкое рассеянное освещение сверху. Натуральная, органическая атмосфера. "
        "8K коммерческое фото."
    ),
    "white_clean": (
        "НАПРАВЛЕНИЕ СТИЛЯ: Изолируй главный объект на фото и замени текущий фон "
        "на бесшовный, идеально белый студийный фон (RGB 255,255,255). "
        "Сохрани точную форму и пропорции объекта. "
        "Студийные софтбоксы, мягкие тени только под объектом. "
        "Товар по центру, 65-75% кадра. "
        "Никаких предметов, текстов, декораций, цветных элементов. "
        "Идеально для каталога маркетплейса. 8K качество."
    ),
}


# ---------------------------------------------------------------------------
# Main Director function
# ---------------------------------------------------------------------------

def analyze_product_and_create_prompt(
    product_image_bytes: bytes,
    style: str = "hero",
    marketplace: str = "wb",
    product_info: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """AI Director: analyze product image and create a custom scene prompt.

    This is a SYNCHRONOUS function designed to run inside the RQ worker.
    Calls Gemini 2.5 Flash (text model) — cheap and fast (~$0.001, ~3-5s).

    Args:
        product_image_bytes: PNG bytes of the product (with transparent bg).
        style: User-selected style key from STYLES dict.
        marketplace: Target marketplace (wb/ozon/ym).
        product_info: Optional dict with title, features, badge from user.

    Returns:
        Dict with keys: product_type, product_colors, scene_concept, prompt,
        mood, recommended_styles. Falls back to style template on failure.
    """
    import io

    from google import genai
    from google.genai import types as genai_types
    from PIL import Image

    # Marketplace dimensions for the prompt
    MP_DIMS = {
        "wb": (900, 1200, "3:4"),
        "ozon": (1200, 1200, "1:1"),
        "ym": (800, 800, "1:1"),
    }

    width, height, aspect_ratio = MP_DIMS.get(marketplace, (900, 1200, "3:4"))

    # Build the Director's analysis request
    style_hint = STYLE_HINTS.get(style, "")

    # Build product context from seller-provided info
    user_context = ""
    has_text_info = False
    if product_info:
        title = product_info.get("title", "")
        features = product_info.get("features", [])
        badge = product_info.get("badge", "")
        has_text_info = bool(title or features or badge)

        parts = []
        if title:
            parts.append(f"Название товара (русский): {title}")
        if features:
            parts.append(f"Преимущества товара: {', '.join(features)}")
        if badge:
            parts.append(f"Текст бейджа: {badge}")
        if parts:
            user_context = (
                "\n\nИНФОРМАЦИЯ ОТ ПРОДАВЦА (ОБЯЗАТЕЛЬНО включи в промпт как текстовые элементы):\n"
                + "\n".join(parts)
            )
    else:
        user_context = "\n\nПродавец НЕ указал текстовую информацию — создай ЧИСТОЕ ФОТО без текстовых элементов."

    # Tell Director whether to create infographic or clean photo
    infographic_hint = ""
    if has_text_info:
        infographic_hint = (
            "\n\nВАЖНО: Продавец указал название/преимущества/бейдж — "
            "ОБЯЗАТЕЛЬНО создай промпт в стиле ИНФОГРАФИКИ с текстовыми плашками. "
            "Используй формат продающей карточки Wildberries/Ozon."
        )

    mp_name = (
        "Wildberries" if marketplace == "wb"
        else "Ozon" if marketplace == "ozon"
        else "Яндекс.Маркет"
    )

    analysis_prompt = (
        f"{DIRECTOR_SYSTEM_PROMPT}\n\n"
        f"{style_hint}\n\n"
        f"РАЗРЕШЕНИЕ: {width}x{height}px (соотношение сторон {aspect_ratio}).\n"
        f"МАРКЕТПЛЕЙС: {mp_name}."
        f"{user_context}"
        f"{infographic_hint}\n\n"
        "Проанализируй фото товара и создай оптимальный промпт. "
        "Верни ТОЛЬКО валидный JSON, без markdown-блоков."
    )

    # Set proxy for geo-block bypass
    proxy_url = os.environ.get("HTTP_PROXY", "")
    if proxy_url:
        os.environ["HTTPS_PROXY"] = proxy_url

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set, AI Director skipped")
        return _fallback_result(style, width, height)

    try:
        # Load product image
        product_image = Image.open(io.BytesIO(product_image_bytes))

        client = genai.Client(api_key=api_key)

        logger.info("AI Director: analyzing product for style=%s, marketplace=%s", style, marketplace)
        start_ms = _now_ms()

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[product_image, analysis_prompt],
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        elapsed = _now_ms() - start_ms
        logger.info("AI Director: analysis completed in %dms", elapsed)

        # Parse JSON response
        response_text = response.text.strip()
        director_result = json.loads(response_text)

        # Validate required fields
        if "prompt" not in director_result or not director_result["prompt"]:
            logger.warning("AI Director returned empty prompt, using fallback")
            return _fallback_result(style, width, height)

        # Enhance the prompt with resolution and preservation instructions
        prompt = director_result["prompt"]

        # Ensure resolution is specified
        if f"{width}x{height}" not in prompt:
            prompt += f"\nРазрешение: {width}x{height}px."

        # Ensure the core reference/preservation instruction is present
        ref_instruction = (
            "Используй загруженное фото продукта как единственный Референс Объекта "
            "— строго сохраняя форму, пропорции, материал, цвет"
        )
        if "строго сохраняя форму" not in prompt and "референс" not in prompt.lower():
            prompt += f"\n{ref_instruction}."

        # Ensure prompt ends with 8K quality marker
        if "8K" not in prompt:
            prompt += "\n8K фотореализм."

        director_result["prompt"] = prompt

        logger.info(
            "AI Director: product_type=%s, concept=%s, prompt_len=%d",
            director_result.get("product_type", "unknown"),
            director_result.get("scene_concept", "unknown")[:50],
            len(prompt),
        )

        return director_result

    except json.JSONDecodeError as e:
        logger.warning("AI Director: invalid JSON response: %s", str(e)[:200])
        return _fallback_result(style, width, height)
    except Exception as e:
        logger.warning("AI Director: analysis failed: %s", str(e)[:300])
        return _fallback_result(style, width, height)


# ---------------------------------------------------------------------------
# Fallback: return a basic result when Director fails
# ---------------------------------------------------------------------------

def _fallback_result(style: str, width: int, height: int) -> dict[str, Any]:
    """Return a minimal fallback when AI Director is unavailable."""
    logger.info("AI Director: using fallback for style=%s", style)
    return {
        "product_type": "unknown",
        "product_colors": [],
        "scene_concept": "Standard style template",
        "prompt": "",  # Empty prompt signals worker to use old-style template
        "mood": "",
        "recommended_styles": [style],
        "_fallback": True,
    }


def _now_ms() -> int:
    """Current time in milliseconds."""
    import time
    return int(time.time() * 1000)
