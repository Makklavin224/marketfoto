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

Your job: analyze the product in the uploaded image and create a detailed scene description that will produce a stunning, professional product photograph.

RULES:
1. IDENTIFY the product: what it is, its color palette, material, size category
2. CHOOSE a scene concept that makes this specific product irresistible:
   - Cosmetics/beauty → soft lighting, water/glass elements, ingredient accents, beauty editorial feel
   - Electronics → clean tech aesthetic, subtle reflections, dark moody or bright minimal
   - Food/drinks → appetizing styling, fresh ingredients, steam/condensation, food photography lighting
   - Clothing/fashion → lifestyle context, complementary accessories, aspirational setting
   - Home goods → cozy interior scene, styled setting, warm natural light
   - Kids products → playful colors, soft textures, cheerful bright setting
   - Sports/fitness → dynamic energy, action feel, bold colors
   - Tools/hardware → industrial strength, durability showcase, clean workshop setting
   - Supplements/health → clean medical-grade aesthetic, nature elements, trust-building
   - Jewelry/accessories → dramatic close-up, reflections, luxurious texture
3. DESCRIBE the scene with extreme detail:
   - Exact background (color, texture, material)
   - Lighting (direction, quality, color temperature)
   - Props (2-3 specific complementary objects)
   - Composition (product placement, camera angle, depth of field)
   - Mood/atmosphere keywords
4. Include technical photography terms: depth of field, bokeh, rim light, key light, fill light, color grading
5. Always end the prompt with: "IMPORTANT: Use the uploaded product image exactly — preserve form, proportions, colors, labels, packaging unchanged."

OUTPUT FORMAT (JSON only, no markdown fences):
{
  "product_type": "cosmetics",
  "product_colors": ["pink", "white"],
  "scene_concept": "Luxurious spa bathroom setting",
  "prompt": "The full detailed English prompt for image generation...",
  "mood": "luxurious, fresh, clean",
  "recommended_styles": ["glass_surface", "ingredients", "lifestyle_scene"]
}"""

# ---------------------------------------------------------------------------
# Style hints — how each user-selected style should influence the Director
# ---------------------------------------------------------------------------

STYLE_HINTS: dict[str, str] = {
    "studio_clean": (
        "STYLE DIRECTION: Clean studio photography. Focus on minimal background, "
        "perfect three-point lighting (key, fill, rim), no props, product-only hero shot. "
        "Apple-style commercial photography aesthetic. Product centered, 60% of frame."
    ),
    "premium_hero": (
        "STYLE DIRECTION: Dramatic hero shot. Focus on cinematic side lighting, "
        "deep rich complementary background colors, strong rim light creating glowing edges, "
        "polished dark reflective surface. Award-winning advertising campaign feel. "
        "Product 50-60% of frame, slightly angled for dynamism."
    ),
    "lifestyle_scene": (
        "STYLE DIRECTION: Lifestyle scene. Place product in a carefully styled real-life setting "
        "with 2-3 complementary props matching its category. Soft natural golden-hour lighting. "
        "Shallow depth of field — product sharp, background softly blurred. "
        "Instagram-worthy, aspirational editorial feel."
    ),
    "glass_surface": (
        "STYLE DIRECTION: Glass surface beauty shot. Product on transparent glass shelf. "
        "Add realistic water droplets on glass. Beautiful reflections beneath product. "
        "Clean gradient background. Studio lighting from above with side accent "
        "highlighting glass and water drops. Beauty/cosmetics advertising style."
    ),
    "ingredients": (
        "STYLE DIRECTION: Ingredient story. Surround the product with fresh, photogenic "
        "ingredients related to the product (fruits, herbs, flowers, spices). "
        "Some cut in half to show freshness. Artful arrangement, soft even lighting. "
        "Color palette harmonized. Like Anua or The Ordinary beauty ads."
    ),
    "with_model": (
        "STYLE DIRECTION: Model advertisement. Show a stylish model naturally holding "
        "or using the product. Natural confident expression. Professional beauty lighting. "
        "Clean studio background with subtle gradient. Model styled to match brand feel. "
        "Product clearly visible and prominent (30%+ of frame)."
    ),
    "multi_angle": (
        "STYLE DIRECTION: Multi-angle display. Show product from 4-6 different angles "
        "in a clean grid layout: front, back, side, detail close-up, top-down. "
        "Consistent white/light gray background and studio lighting across all angles."
    ),
    "infographic": (
        "STYLE DIRECTION: Infographic card. Product on left or center (40% width). "
        "Around it, add 4-6 feature blocks with simple icons and short text labels "
        "connected by thin lines or arrows. Cohesive color scheme. "
        "Wildberries/Ozon marketplace infographic card style."
    ),
    "nine_grid": (
        "STYLE DIRECTION: 3x3 detail grid. Center cell: full product. "
        "Surrounding 8 cells: extreme close-ups of different details — "
        "texture, buttons, material, label, stitching, finish. "
        "Consistent lighting, clean background, thin white borders."
    ),
    "creative_art": (
        "STYLE DIRECTION: Creative artistic composition. Bold vibrant colors, "
        "geometric shapes, abstract elements complementing product colors. "
        "Dramatic lighting with color splashes. Flying elements or particles "
        "related to product category. Eye-catching marketplace card."
    ),
    "storyboard": (
        "STYLE DIRECTION: Storyboard sequence. 3-4 panels showing: "
        "product in packaging, being opened/used, in action (key benefit), "
        "happy result. Consistent color palette across panels."
    ),
    "detail_texture": (
        "STYLE DIRECTION: Macro detail shot. Split composition: one half full product, "
        "other half extreme close-up of most impressive detail/texture. "
        "Professional macro photography lighting, sharp focus on textures. "
        "Luxury quality showcase."
    ),
    "seasonal": (
        "STYLE DIRECTION: Seasonal theme. Choose the most appropriate season. "
        "Spring: cherry blossoms, soft pink. Summer: sunshine, tropical, vibrant. "
        "Autumn: golden leaves, warm tones. Winter: snow, frost, cool blue. "
        "Seasonal editorial mood-driven advertising."
    ),
    "minimal_flat": (
        "STYLE DIRECTION: Top-down flat-lay. Bird's eye view. Product centered on "
        "clean surface (marble, wood, pastel). 2-3 small complementary props "
        "arranged geometrically. Even shadowless overhead lighting. Lots of negative space. "
        "Instagram flat-lay minimalist aesthetic."
    ),
    "unboxing": (
        "STYLE DIRECTION: Unboxing reveal. Product emerging from or in front of "
        "stylish open box. Premium packaging feel — tissue paper, ribbon. "
        "Exciting reveal moment frozen in time. Apple-like unboxing experience."
    ),
}

# ---------------------------------------------------------------------------
# Real prompt patterns from top marketplace photographers
# (da_omka, TOPSEL, Студия TOPSEL Instagram analysis)
# ---------------------------------------------------------------------------

CATEGORY_PROMPT_PATTERNS: dict[str, str] = {
    "cosmetics": (
        "Reference technique: luxury natural skincare photography, top-down angle. "
        "Product bottle (USE EXACT PRODUCT IMAGE) lying perfectly centered on a smooth wet stone. "
        "Surrounding: moss, small flowing stream, natural rocks, water droplets on the bottle surface. "
        "Do not alter product design — match bottle geometry, labels, logo, transparency and cap. "
        "Soft diffused forest light, mid-green tones, cinematic realism, organic textures, "
        "ultra-high detail, premium eco-beauty advertising style."
    ),
    "cosmetics_glass": (
        "Reference technique: product on transparent glass shelf tilted at slight angle. "
        "Along glass edge — neat transparent water streams. Around base — exquisite cream foam, "
        "partially sliding down. Glass surface reflects product softly and cleanly. "
        "Background — gentle cool blue gradient. Light — high-end beauty lighting, "
        "controlled highlights, deep soft shadow. Premium advertising style. "
        "Photorealistic, 8K resolution."
    ),
    "cosmetics_floral": (
        "Reference technique: product bottle surrounded by fresh peonies and cornflowers. "
        "Soft natural light filtering through petals. Product perfectly sharp, flowers slightly soft. "
        "Pastel color palette matching product tones. Fresh, feminine, spring atmosphere. "
        "Editorial beauty photography, shallow depth of field."
    ),
    "food": (
        "Reference technique: ultra-realistic outdoor food photography. "
        "Product package stood upright on a cutting board next to rustic barbecue grill. "
        "In the foreground — a few related food items (toasted pieces, fresh vegetables). "
        "Small embers and sparks from grill appear subtly in the air. "
        "Lighting simulates warm evening outdoor lighting with natural sunlight from side "
        "and soft warm glow from the grill. Photorealistic, premium outdoor food advertising. "
        "Shallow depth of field, natural color grading, 4K resolution."
    ),
    "food_sweet": (
        "Reference technique: put the product on smooth 3D-rendered ceramic white plate. "
        "Product cross-section visible showing texture and layers inside. "
        "Key ingredient (pistachio/chocolate/cream) flowing down creating swirling patterns. "
        "Scattered ingredient pieces around the plate. Rich dark cinematic lighting, "
        "cinematic food photography lighting with strong side light creating depth and shadows, "
        "soft shadows emphasizing the glossy surface. Ultra-realistic food commercial."
    ),
    "food_flatlay": (
        "Reference technique: creative product photo on coffee shop table. "
        "Laying bars/packages from side against warm brown surface. "
        "Coffee cups, bread slices, scattered nuts and ingredients around. "
        "Warm rustic light, food photography, FMCG lifestyle, "
        "natural textures (wood, linen, ceramic). Top-down flat lay angle."
    ),
    "food_conceptual": (
        "Reference technique: conceptual art meets food photography. "
        "A slice of fresh toast spread with smooth chocolate/cream sauce. "
        "Glossy product placed directly on the spread. "
        "Minimalist beige background, ceramic plate, stainless knife. "
        "Top-down flat lay. Warm directional studio light, soft shadows. "
        "Style: modern editorial beauty advertising meets food art."
    ),
    "electronics": (
        "Reference technique: detailed 3D-deconstruction style. "
        "Product positioned at center, disassembled components floating around it "
        "showing internal parts, circuits, LED displays, chipsets. "
        "Clean pink/white/brand-colored studio background. "
        "Every detail hyper-rendered. Subtle shadows. "
        "Apple-style exploded view product photography. Professional and tech-forward."
    ),
    "beauty_with_model": (
        "Reference technique: model with clean natural skin holds product near face. "
        "Airy background, natural makeup. Skin glowing without overexposure. "
        "Product fully readable — label, cap, design intact. "
        "Background — pastel, soft gradient. Light — diffused editorial beauty lighting. "
        "No overload, no chaos, clean premium. "
        "Close-up beauty photography, shallow depth of field, magazine editorial quality."
    ),
    "clothing": (
        "Reference technique: aspirational lifestyle context. "
        "Complementary accessories visible. Natural confident pose. "
        "Fabric texture clearly visible — threads, weave pattern, drape. "
        "Professional fashion photography with editorial feel. "
        "Clean but styled background. Soft rim light separating subject from background."
    ),
    "home_goods": (
        "Reference technique: cozy interior scene. Warm natural light from window. "
        "Product naturally integrated into styled kitchen/living room setting. "
        "Complementary home elements: plants, textiles, ceramic dishes. "
        "Interior design photography aesthetic. Warm color temperature, "
        "inviting and aspirational."
    ),
    "supplements": (
        "Reference technique: clean medical-grade aesthetic combined with nature. "
        "Product on clean surface with natural ingredient accents "
        "(herbs, fruits, leaves matching the supplement type). "
        "Trust-building, professional, health-focused. "
        "Clinical white combined with fresh green accents."
    ),
    "gift_set": (
        "Reference technique: create a bright and inviting gift box visual. "
        "Product inside premium packaging with tissue paper/ribbons. "
        "Festive elements: Christmas ornaments, confetti, or seasonal decorations. "
        "Rich green/red/gold velvet or satin backdrop. Warm holiday lighting. "
        "Gift photography style — premium unboxing experience."
    ),
    "storyboard": (
        "Reference technique: create cinematographic storyboard collage. "
        "Based on decorative AI-generated images showing product in use — "
        "7 frames: close portrait, full-length shot, medium shot detail, "
        "action scene, hero product shot, lifestyle moment, artistic angle. "
        "Each frame has slight color grading. "
        "Floral details in pastel tones. Soft editorial cinema feel."
    ),
}


# ---------------------------------------------------------------------------
# Main Director function
# ---------------------------------------------------------------------------

def analyze_product_and_create_prompt(
    product_image_bytes: bytes,
    style: str = "premium_hero",
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
            if style == "with_model":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("beauty_with_model", "")
            elif style == "glass_surface":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("cosmetics_glass", "")
            elif style == "ingredients":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("cosmetics_floral", "")
            else:
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("cosmetics", "")
        elif product_type in ("food", "snack", "drink", "beverage"):
            if style in ("minimal_flat", "lifestyle_scene"):
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("food_flatlay", "")
            elif style == "creative_art":
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("food_conceptual", "")
            elif style in ("detail_texture", "ingredients"):
                category_pattern = CATEGORY_PROMPT_PATTERNS.get("food_sweet", "")
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
        elif style == "unboxing":
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("gift_set", "")
        elif style == "storyboard":
            category_pattern = CATEGORY_PROMPT_PATTERNS.get("storyboard", "")
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
