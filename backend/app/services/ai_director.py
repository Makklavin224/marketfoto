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

## ЖЕЛЕЗНЫЕ ПРАВИЛА (нарушать НЕЛЬЗЯ):

1. ФОН ВСЕГДА ТЁМНЫЙ (кроме стиля white_clean). Выбирай цвет по категории товара:
   - Спорт/питание → тёмно-синий (#0A1628) с голубым неоновым свечением
   - Авто → тёмно-серый (#1A1A2E) с металлическим отливом
   - Косметика → тёмно-зелёный (#0D3B2E) или тёмно-бирюзовый
   - Еда → тёплый тёмный (#2C1810) с тёплым свечением
   - Электроника → чёрный (#0D0D0D) с холодными синими бликами
   - Дом/уборка → тёмно-синий (#0F1B3D) с голубыми акцентами
   - Здоровье → тёмно-фиолетовый (#1A0A2E)
   - Если категория не подходит — используй тёмный фон, комплементарный цвету товара

2. НАЗВАНИЕ ТОВАРА — ВСЕГДА ЗАГЛАВНЫМИ БУКВАМИ, белый жирный шрифт, 48-72pt, сверху изображения

3. КЛЮЧЕВЫЕ ЦИФРЫ — ОГРОМНЫЙ ШРИФТ (72-96pt), КРУПНЕЕ НАЗВАНИЯ. Извлеки числа из features:
   - "Объём 500 мл" → цифра "500" шрифтом 96pt, подпись "мл" рядом шрифтом 36pt
   - "2200 Вт мощность" → цифра "2200" шрифтом 96pt, подпись "Вт" рядом
   - "120 LED" → цифра "120" шрифтом 96pt, подпись "LED"
   - Числа — ГЛАВНЫЙ визуальный элемент после самого товара

4. ПЛАШКИ — 2-4 скруглённых полупрозрачных прямоугольника (pill-shape) слева и справа от товара:
   - Каждая плашка: ИКОНКА + ТЕКСТ (2-4 слова)
   - Иконки: ⚡ для мощности/скорости, 🛡️ для защиты/качества, 💧 для воды, ✓ для фич, 🔥 для хита
   - Яркие цвета плашек: жёлтый/зелёный/голубой на тёмном фоне
   - Полупрозрачный фон rgba(255,255,255,0.1) с размытием

5. БЕЙДЖ — яркий цветной кружок/лента в верхнем правом углу (красный/оранжевый)

6. ТОВАР — 40-50% кадра, по центру, с мягкой падающей тенью (drop shadow), слегка под углом (5-10 градусов)

7. КОНЦОВКА КАЖДОГО ПРОМПТА: "8K фотореализм, стиль продающей карточки Wildberries/Ozon"

8. НИКОГДА не предлагай 3D-декомпозицию, разобранные виды или exploded views

9. "Используй загруженное фото продукта как единственный референс-объект — строго сохраняя форму, пропорции, материал, цвет и детали без изменений" — включай ВСЕГДА

## АЛГОРИТМ РАБОТЫ:

### ШАГ 1. Определи товар:
- Что это за товар, его категория (для выбора цвета фона из правила 1)
- Основные цвета, материал, форма
- Размер (мелкий/средний/крупный)

### ШАГ 2. ОПРЕДЕЛИ ТИП КАРТОЧКИ:

**ЕСЛИ продавец указал title (название) и/или features (преимущества) → ИНФОГРАФИКА:**
Используй эту ПРОВЕРЕННУЮ структуру:

"Профессиональное коммерческое макро-фото для маркетплейса. Используй загруженное фото продукта как единственный референс-объект — строго сохраняя форму, пропорции, материал, цвет и детали без изменений. Создай продающую карточку маркетплейса: центр — крупный товар (40-50% кадра) с мягкой тенью, фон — [ТЁМНЫЙ ЦВЕТ по категории товара]. ТЕКСТОВЫЕ ЭЛЕМЕНТЫ: Сверху крупно ЗАГЛАВНЫМИ '{TITLE}' (белый жирный шрифт 48-72pt). Ключевые цифры ОГРОМНЫМ шрифтом (72-96pt): [цифры из features]. Слева и справа от товара — {N} стильных полупрозрачных плашек (скруглённые прямоугольники) с преимуществами: [каждая плашка = иконка + текст]. Бейдж '{BADGE}' — яркий цветной кружок/лента в верхнем правом углу. Крупные цифры, чистая инфографика, высокий контраст. 8K фотореализм, стиль продающей карточки Wildberries/Ozon."

**ЕСЛИ продавец НЕ указал текст → ЧИСТОЕ ФОТО (hero/lifestyle/creative):**
Создай промпт без текстовых элементов, но фон ВСЁ РАВНО тёмный (кроме white_clean).

### ШАГ 3. АДАПТИРУЙ ПОД СТИЛЬ:

**hero (Обложка)** → Тёмный фон по категории. Товар 40-50% кадра с drop shadow. Название CAPS сверху. Огромные ключевые цифры. 2-3 плашки с иконками. Бейдж в углу. Если нет текста — товар крупно на тёмном фоне с профессиональным контровым светом, создающим светящийся контур.

**lifestyle (Лайфстайл)** → Товар в реальной сцене (ванная/кухня/стол) НО С ТЁМНЫМ ПОЛУПРОЗРАЧНЫМ ОВЕРЛЕЕМ на фото. Текстовые элементы поверх оверлея. Если нет текста — кинематографический кадр, глубина резкости, golden hour из окна.

**creative (Креатив)** → Левитация товара + летающие тематические элементы (ингредиенты, частицы, брызги). Тёмный фон с ярким неоновым свечением. Название CAPS крупно. Плашки с иконками. НИКОГДА не 3D-декомпозиция.

**closeup (Макро-детали)** → Серия из 4 кадров в формате 2x2 с тёмным фоном. Каждая ячейка ПОДПИСАНА белым текстом (что показано). Единообразное контровое освещение.

**ingredients (Состав)** → Товар в центре + 4-6 ингредиентов вокруг. Тёмный фон. Каждый ингредиент подписан на плашке. Некоторые ингредиенты разрезаны пополам.

**white_clean (Белый фон)** → ЕДИНСТВЕННЫЙ СТИЛЬ с белым фоном. Изолируй объект на бесшовном белом (RGB 255,255,255). Студийные софтбоксы. Никаких текстов, плашек, декораций. Товар 65-75% кадра. Для каталога маркетплейса.

### ШАГ 4. ИЗВЛЕЧЕНИЕ ЦИФР ИЗ FEATURES:
Это КРИТИЧЕСКИ ВАЖНЫЙ шаг. Найди в features любые числа и сделай их ОГРОМНЫМИ:
- "Объём 500 мл" → ОГРОМНЫМ шрифтом (96pt) число '500' с подписью 'мл'
- "2200 Вт мощность" → ОГРОМНЫМ шрифтом число '2200' с подписью 'Вт'
- "120 LED" → ОГРОМНЫМ шрифтом число '120' с подписью 'LED'
- "5000 мг креатина" → ОГРОМНЫМ шрифтом число '5000' с подписью 'мг'
- "24 часа защита" → ОГРОМНЫМ шрифтом число '24' с подписью 'часа'
- "100+ применений" → ОГРОМНЫМ шрифтом число '100+' с подписью 'применений'
Если числа нет — пропусти этот элемент, не выдумывай числа.

### ШАГ 5. ОБЯЗАТЕЛЬНЫЕ ЭЛЕМЕНТЫ КАЖДОГО ПРОМПТА:
1. "Используй загруженное фото продукта как единственный референс-объект — строго сохраняя форму, пропорции, материал, цвет и детали без изменений"
2. ТЁМНЫЙ фон с конкретным HEX-цветом по категории (кроме white_clean)
3. Конкретное описание контрового/бокового освещения
4. "8K фотореализм, стиль продающей карточки Wildberries/Ozon" в конце
5. НИКОГДА не предлагай 3D-декомпозицию или разобранные виды

ФОРМАТ ОТВЕТА (только JSON, без markdown-блоков):
{
  "product_type": "cosmetics",
  "product_colors": ["розовый", "белый"],
  "background_color": "#0D3B2E",
  "scene_concept": "Тёмно-зелёный фон, товар крупно с тенью, плашки с иконками",
  "prompt": "Полный детальный промпт на РУССКОМ языке для генерации изображения...",
  "mood": "премиальный, свежий, чистый",
  "recommended_styles": ["hero", "lifestyle", "ingredients"],
  "extracted_numbers": [{"value": "500", "unit": "мл"}, {"value": "24", "unit": "часа"}]
}"""

# ---------------------------------------------------------------------------
# Style hints — how each user-selected style should influence the Director
# Based on PROVEN prompt templates from marketplace professionals.
# ---------------------------------------------------------------------------

STYLE_HINTS: dict[str, str] = {
    "hero": (
        "НАПРАВЛЕНИЕ СТИЛЯ: ОБЛОЖКА (Cover) — главная карточка товара. "
        "ТЁМНЫЙ ФОН обязателен — выбери HEX-цвет по категории товара. "
        "Товар 40-50% кадра по центру с мягкой падающей тенью (drop shadow). "
        "Контровое освещение создаёт светящийся контур вокруг товара. "
        "ЕСЛИ есть title — написать ЗАГЛАВНЫМИ БУКВАМИ белым жирным 48-72pt сверху. "
        "ЕСЛИ есть numbers в features — показать ОГРОМНЫМ шрифтом 72-96pt. "
        "2-4 полупрозрачные плашки (pill-shape) с иконками слева/справа от товара. "
        "Бейдж — яркий кружок/лента в верхнем правом углу. "
        "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
    ),
    "lifestyle": (
        "НАПРАВЛЕНИЕ СТИЛЯ: ЛАЙФСТАЙЛ с текстовыми наложениями. "
        "Товар в реальной сцене (ванная/кухня/стол по категории), "
        "НО С ТЁМНЫМ ПОЛУПРОЗРАЧНЫМ ОВЕРЛЕЕМ поверх фотографии (rgba(0,0,0,0.5)). "
        "Текстовые элементы поверх оверлея: название CAPS, плашки, бейдж. "
        "Если нет текстовой информации — кинематографический кадр без оверлея, "
        "глубина резкости, товар резкий, фон размыт, golden hour из окна. "
        "Реалистичные отражения, блики. "
        "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
    ),
    "creative": (
        "НАПРАВЛЕНИЕ СТИЛЯ: КРЕАТИВ — левитация и динамика. "
        "ТЁМНЫЙ ФОН с ярким неоновым свечением по категории товара. "
        "Товар парит в воздухе, вокруг летают тематические элементы "
        "(ингредиенты, частицы, брызги — выбери по типу товара). "
        "Название ЗАГЛАВНЫМИ крупно. Плашки с иконками. Бейдж. "
        "Яркое драматичное контровое освещение с цветными источниками. "
        "Замороженный момент действия — энергия и движение. "
        "НИКОГДА не используй 3D-декомпозицию или exploded views. "
        "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
    ),
    "closeup": (
        "НАПРАВЛЕНИЕ СТИЛЯ: МАКРО-ДЕТАЛИ — серия из 4 кадров в формате 2x2. "
        "ТЁМНЫЙ ФОН в каждой ячейке. "
        "1. Общий вид спереди 2. Детали/текстура крупно "
        "3. Вид сбоку/под углом 4. Акцент на ключевой детали. "
        "Каждая ячейка ПОДПИСАНА белым текстом — что именно показано. "
        "Единообразное контровое освещение во всех кадрах. "
        "Профессиональная макросъёмка, резкий фокус на текстурах. "
        "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
    ),
    "ingredients": (
        "НАПРАВЛЕНИЕ СТИЛЯ: СОСТАВ — товар + ингредиенты. "
        "ТЁМНЫЙ ФОН по категории товара. "
        "Товар в центре (40-45% кадра) с drop shadow. "
        "Вокруг 4-6 конкретных ингредиентов/компонентов (определи и назови их). "
        "Каждый ингредиент подписан на полупрозрачной плашке. "
        "Некоторые разрезаны пополам для показа свежести. "
        "Мягкое контровое освещение, натуральная атмосфера. "
        "8K фотореализм, стиль продающей карточки Wildberries/Ozon."
    ),
    "white_clean": (
        "НАПРАВЛЕНИЕ СТИЛЯ: БЕЛЫЙ ФОН — единственный стиль с белым фоном! "
        "Изолируй главный объект, замени фон на бесшовный белый (RGB 255,255,255). "
        "Сохрани точную форму и пропорции объекта. "
        "Студийные софтбоксы, мягкие тени только под объектом. "
        "Товар по центру, 65-75% кадра. "
        "НИКАКИХ предметов, текстов, декораций, плашек, цветных элементов. "
        "Идеально для каталога маркетплейса. 8K качество."
    ),
}

# ---------------------------------------------------------------------------
# Category → background color mapping (used by Director and fallback prompts)
# ---------------------------------------------------------------------------

CATEGORY_BACKGROUNDS: dict[str, tuple[str, str]] = {
    # category → (hex_color, description)
    "sport": ("#0A1628", "тёмно-синий с голубым неоновым свечением"),
    "nutrition": ("#0A1628", "тёмно-синий с голубым неоновым свечением"),
    "supplements": ("#0A1628", "тёмно-синий с голубым неоновым свечением"),
    "automotive": ("#1A1A2E", "тёмно-серый с металлическим отливом"),
    "cosmetics": ("#0D3B2E", "тёмно-зелёный с бирюзовым свечением"),
    "beauty": ("#0D3B2E", "тёмно-зелёный с бирюзовым свечением"),
    "food": ("#2C1810", "тёплый тёмно-коричневый"),
    "electronics": ("#0D0D0D", "чёрный с холодными синими бликами"),
    "tech": ("#0D0D0D", "чёрный с холодными синими бликами"),
    "home": ("#0F1B3D", "тёмно-синий с голубыми акцентами"),
    "cleaning": ("#0F1B3D", "тёмно-синий с голубыми акцентами"),
    "health": ("#1A0A2E", "тёмно-фиолетовый"),
    "clothing": ("#1C1C1E", "глубокий тёмно-серый"),
    "default": ("#0D1117", "глубокий тёмный"),
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
            parts.append(f"НАЗВАНИЕ ТОВАРА: '{title}' — написать ЗАГЛАВНЫМИ БУКВАМИ белым жирным 48-72pt сверху")
        if features:
            # Extract numbers from features for HUGE display
            import re
            number_instructions = []
            for feat in features:
                match = re.search(r'(\d+[\+]?)\s*(мл|мг|Вт|шт|кг|г|см|мм|м|л|LED|ч|час\w*|дн\w*|мес\w*|лет|%)', feat)
                if match:
                    num_val = match.group(1)
                    num_unit = match.group(2)
                    number_instructions.append(
                        f"Число '{num_val}' с подписью '{num_unit}' — ОГРОМНЫМ шрифтом 72-96pt, "
                        f"крупнее названия товара (из: '{feat}')"
                    )

            parts.append(f"ПРЕИМУЩЕСТВА (каждое в полупрозрачной плашке с иконкой): {', '.join(features)}")

            if number_instructions:
                parts.append(
                    "КЛЮЧЕВЫЕ ЦИФРЫ (показать ОГРОМНЫМ шрифтом 72-96pt, это главный визуальный элемент):\n"
                    + "\n".join(f"  - {instr}" for instr in number_instructions)
                )

        if badge:
            parts.append(f"БЕЙДЖ: '{badge}' — яркий цветной кружок/лента в верхнем правом углу, белый жирный текст")
        if parts:
            user_context = (
                "\n\nИНФОРМАЦИЯ ОТ ПРОДАВЦА (ОБЯЗАТЕЛЬНО включи в промпт как текстовые элементы):\n"
                + "\n".join(parts)
            )
    else:
        user_context = (
            "\n\nПродавец НЕ указал текстовую информацию — создай ЧИСТОЕ ФОТО без текстовых элементов. "
            "Фон ВСЁ РАВНО тёмный (кроме white_clean)."
        )

    # Tell Director whether to create infographic or clean photo
    infographic_hint = ""
    if has_text_info:
        infographic_hint = (
            "\n\nВАЖНО: Продавец указал название/преимущества/бейдж — "
            "ОБЯЗАТЕЛЬНО создай промпт в стиле ИНФОГРАФИКИ с текстовыми плашками. "
            "Используй ПРОВЕРЕННЫЙ формат продающей карточки Wildberries/Ozon: "
            "тёмный фон, товар крупно, CAPS название, ОГРОМНЫЕ цифры, плашки с иконками."
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
            "Используй загруженное фото продукта как единственный референс-объект "
            "— строго сохраняя форму, пропорции, материал, цвет и детали без изменений"
        )
        if "строго сохраняя форму" not in prompt and "референс" not in prompt.lower():
            prompt += f"\n{ref_instruction}."

        # Ensure prompt ends with 8K quality marker + WB/Ozon style tag
        if "8K" not in prompt:
            prompt += "\n8K фотореализм, стиль продающей карточки Wildberries/Ozon."
        elif "Wildberries/Ozon" not in prompt and "Wildberries" not in prompt:
            prompt += "\nСтиль продающей карточки Wildberries/Ozon."

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
