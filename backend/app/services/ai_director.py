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
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Director system prompt — the "brain" that designs each scene
# ---------------------------------------------------------------------------

DIRECTOR_SYSTEM_PROMPT = """You are a world-class advertising art director specializing in e-commerce product photography for Russian marketplaces (Wildberries, Ozon).

Your job: analyze the product in the uploaded image and ENHANCE the user's selected style with product-specific details to produce a stunning, professional product photograph.

RULES:
1. IDENTIFY the product: what it is, its color palette, material, size category
2. IDENTIFY the product CATEGORY:
   - Cosmetics/beauty, Food/drinks, Electronics/tech, Clothing/fashion
   - Home goods/kitchen, Kids products, Sports/fitness, Tools/hardware
   - Supplements/health, Jewelry/accessories
3. ENHANCE the selected style based on the product category:
   - For "hero" → choose the perfect background gradient color based on the product's dominant colors. Light products get darker complementary backgrounds. Dark products get lighter warm backgrounds. Pick SPECIFIC hex colors.
   - For "lifestyle" → choose the perfect scene based on category: cosmetics=bathroom shelf, food=kitchen counter, electronics=clean desk, clothing=wardrobe, home goods=living room. Name SPECIFIC props.
   - For "creative" → choose the perfect artistic concept: cosmetics=flowing cream swirls, food=flying ingredients, electronics=light trails, clothing=fabric movement, sports=energy particles. Be SPECIFIC.
   - For "closeup" → identify the most impressive detail of THIS product to highlight: texture, stitching, mechanism, material grain, label quality.
   - For "ingredients" → identify what THIS product contains or is made of. Name SPECIFIC ingredients or related items to surround it with.
   - For "white_clean" → keep it minimal. Focus on perfect lighting and shadow placement for THIS product's shape.
4. DESCRIBE the scene with extreme detail:
   - Exact background (specific hex color or description)
   - Lighting (direction, quality, color temperature)
   - Props (2-3 SPECIFIC complementary objects for lifestyle/creative)
   - Composition (product placement, camera angle, depth of field)
   - Mood/atmosphere keywords
5. Include technical photography terms: depth of field, bokeh, rim light, key light, fill light, color grading
6. NEVER suggest 3D deconstruction or exploded views — those look artificial
7. Always end the prompt with: "IMPORTANT: Use the uploaded product image exactly — preserve form, proportions, colors, labels, packaging unchanged."

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "product_type": "cosmetics",
  "product_colors": ["pink", "white"],
  "scene_concept": "Luxurious spa bathroom setting",
  "prompt": "The full detailed English prompt for image generation...",
  "mood": "luxurious, fresh, clean",
  "recommended_styles": ["hero", "lifestyle", "ingredients"]
}"""

# ---------------------------------------------------------------------------
# Style hints — how each user-selected style should influence the Director
# ---------------------------------------------------------------------------

STYLE_HINTS: dict[str, str] = {
    "hero": (
        "STYLE DIRECTION: Clean hero product shot. Product centered on a smooth gradient background. "
        "Choose background color that COMPLEMENTS the product — analyze the product's dominant colors "
        "and pick a contrasting or harmonious gradient. Light products → darker rich background. "
        "Dark products → lighter warm background. Professional three-point lighting. "
        "No props, no text, no scene — ONLY the product looking premium. 60-70% of frame. "
        "This is the MAIN marketplace image — it must look like a professional studio photograph."
    ),
    "lifestyle": (
        "STYLE DIRECTION: Lifestyle scene. Place product in a real-world setting that matches its CATEGORY. "
        "Choose the SPECIFIC scene: cosmetics → bathroom shelf or vanity; food → kitchen counter; "
        "electronics → clean modern desk; clothing → styled room; home goods → living room/kitchen. "
        "Add 2-3 SPECIFIC complementary props (name them). Warm golden-hour window light. "
        "Shallow depth of field — product sharp, background blurred. Like the product is already "
        "in the buyer's home. No text overlays."
    ),
    "creative": (
        "STYLE DIRECTION: Bold creative advertisement. Dynamic composition with WOW factor. "
        "Choose a SPECIFIC creative concept based on the product: flying ingredients/particles, "
        "color splashes, liquid swirls, energy trails, geometric shapes. "
        "Dramatic side lighting with colored rim lights. Vibrant, saturated colors. "
        "The product should feel like it's in motion — frozen action moment. "
        "NEVER use 3D deconstruction or exploded views. No text overlays."
    ),
    "closeup": (
        "STYLE DIRECTION: Macro detail showcase in a 2x2 grid layout. "
        "Identify the 3 most impressive details of THIS specific product — "
        "texture, material quality, stitching, mechanism, label, surface finish. "
        "Top-left: full product. Other 3 cells: extreme close-ups of those details. "
        "Professional macro lighting. Sharp focus on textures. Clean backgrounds."
    ),
    "ingredients": (
        "STYLE DIRECTION: Ingredient/component story. Identify what THIS product contains "
        "or is made of, then surround it with those SPECIFIC items: "
        "cosmetics → the actual herbs, flowers, oils mentioned; food → raw ingredients; "
        "supplements → fruits, plants; electronics → usage scenarios. "
        "Artful arrangement, some items cut open. Soft even lighting. "
        "Natural, organic feel. No text overlays."
    ),
    "white_clean": (
        "STYLE DIRECTION: Ultra-clean pure white background (#FFFFFF). "
        "Product centered, 65-75% of frame. Minimal contact shadow only. "
        "Bright even lighting from all sides — no colored tints, no dark areas. "
        "This is the mandatory marketplace white background image. "
        "Absolutely no props, text, decorations, or colored elements."
    ),
}

# ---------------------------------------------------------------------------
# Real prompt patterns from top marketplace photographers
# (da_omka, TOPSEL, Студия TOPSEL Instagram analysis)
# ---------------------------------------------------------------------------

CATEGORY_PROMPT_PATTERNS: dict[str, str] = {
    "cosmetics": (
        "Reference technique: luxury natural skincare photography. "
        "Product on a smooth wet stone or marble surface. "
        "Surrounding: moss, water droplets on the bottle surface, natural elements. "
        "Do not alter product design — match bottle geometry, labels, logo, transparency and cap. "
        "Soft diffused light, cinematic realism, organic textures, premium beauty advertising."
    ),
    "cosmetics_ingredients": (
        "Reference technique: product bottle surrounded by fresh peonies, herbs, and essential oils. "
        "Soft natural light filtering through petals. Product perfectly sharp, flowers slightly soft. "
        "Pastel color palette matching product tones. Fresh, feminine atmosphere. "
        "Editorial beauty photography, shallow depth of field."
    ),
    "food": (
        "Reference technique: ultra-realistic food photography. "
        "Product package on a styled surface with related food items visible. "
        "Warm appetizing lighting with natural side light creating depth. "
        "Shallow depth of field, natural color grading. Premium food advertising."
    ),
    "food_ingredients": (
        "Reference technique: product surrounded by its raw ingredients. "
        "Scattered ingredient pieces around — nuts, fruits, spices, herbs. "
        "Rich cinematic lighting with strong side light. "
        "Ultra-realistic food commercial style."
    ),
    "electronics": (
        "Reference technique: clean modern tech product photography. "
        "Product on a minimal surface with subtle reflections. "
        "Clean brand-colored or dark studio background. "
        "Crisp lighting highlighting material quality and design details. "
        "Professional and tech-forward, NOT 3D deconstruction."
    ),
    "clothing": (
        "Reference technique: fabric texture showcase. "
        "Fabric texture clearly visible — threads, weave pattern, drape. "
        "Professional fashion photography with editorial feel. "
        "Clean but styled background. Soft rim light separating from background."
    ),
    "home_goods": (
        "Reference technique: cozy interior scene. Warm natural light from window. "
        "Product naturally integrated into styled kitchen/living room setting. "
        "Complementary home elements: plants, textiles, ceramic dishes. "
        "Interior design photography aesthetic. Warm color temperature."
    ),
    "supplements": (
        "Reference technique: clean aesthetic combined with nature. "
        "Product on clean surface with natural ingredient accents "
        "(herbs, fruits, leaves matching the supplement type). "
        "Trust-building, professional, health-focused."
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

    user_context = ""
    if product_info:
        title = product_info.get("title", "")
        features = product_info.get("features", [])
        badge = product_info.get("badge", "")
        parts = []
        if title:
            parts.append(f"Product name (Russian): {title}")
        if features:
            parts.append(f"Key features: {', '.join(features)}")
        if badge:
            parts.append(f"Badge text: {badge}")
        if parts:
            user_context = "\n\nPRODUCT CONTEXT PROVIDED BY SELLER:\n" + "\n".join(parts)

    analysis_prompt = (
        f"{DIRECTOR_SYSTEM_PROMPT}\n\n"
        f"{style_hint}\n\n"
        f"TARGET RESOLUTION: {width}x{height}px (aspect ratio {aspect_ratio}).\n"
        f"TARGET MARKETPLACE: {marketplace.upper()} "
        f"({'Wildberries' if marketplace == 'wb' else 'Ozon' if marketplace == 'ozon' else 'Яндекс.Маркет'})."
        f"{user_context}\n\n"
        "Analyze the product image and create the optimal scene prompt. "
        "Return ONLY valid JSON, no markdown code fences."
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

        # Enhance the prompt with resolution and preservation instruction
        prompt = director_result["prompt"]

        # Ensure the prompt includes resolution
        if f"{width}x{height}" not in prompt:
            prompt += f"\nResolution: {width}x{height}px."

        # Ensure the prompt ends with the product preservation instruction
        preservation = (
            "IMPORTANT: Use the uploaded product image exactly "
            "— preserve form, proportions, colors, labels, packaging unchanged."
        )
        if "preserve form" not in prompt.lower() and "uploaded product" not in prompt.lower():
            prompt += f"\n{preservation}"

        # Inject category-specific prompt patterns based on product type + style
        product_type = director_result.get("product_type", "").lower()

        # Smart category-to-pattern mapping based on product type + selected style
        category_pattern = ""
        if product_type in ("cosmetics", "beauty", "skincare"):
            if style == "ingredients":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("cosmetics_ingredients", "")
            else:
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("cosmetics", "")
        elif product_type in ("food", "snack", "drink", "beverage"):
            if style == "ingredients":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("food_ingredients", "")
            else:
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("food", "")
        elif product_type in ("electronics", "gadget", "tech"):
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("electronics", "")
        elif product_type in ("clothing", "fashion", "apparel"):
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("clothing", "")
        elif product_type in ("home", "kitchen", "furniture", "decor"):
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("home_goods", "")
        elif product_type in ("supplements", "vitamins", "health"):
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("supplements", "")
        else:
            category_pattern = CATEGORY_PROMPT_PATTERNS.get(product_type, "")

        if category_pattern:
            prompt += f"\n\nProfessional reference technique for this category: {category_pattern}"

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
