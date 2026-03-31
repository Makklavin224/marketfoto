"""Seed script for 5 MVP templates from SPECIFICATION.md.

Usage:
    python -m app.seed_templates

Idempotent: checks slug existence before inserting (skips duplicates).
"""
import asyncio
import json

from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.models.template import Template


SEED_TEMPLATES = [
    # ──────────────────────────────────────────────────────────────
    # 1. Чистый белый (Clean White) — white_bg
    #    Pure white, product centred with soft drop shadow,
    #    bold title centred below, subtle bottom accent line.
    # ──────────────────────────────────────────────────────────────
    {
        "name": "Чистый белый",
        "slug": "clean-white",
        "category": "white_bg",
        "is_premium": False,
        "marketplace": ["wb", "ozon", "ym"],
        "sort_order": 1,
        "preview_url": "/static/templates/clean-white.svg",
        "config": {
            "background": {"type": "solid", "color": "#FFFFFF"},
            "product_area": {"x": 125, "y": 60, "width": 650, "height": 780},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 50,
                    "y": 900,
                    "width": 800,
                    "height": 55,
                    "fontSize": 32,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                },
                {
                    "id": "subtitle",
                    "label": "Краткое описание",
                    "x": 100,
                    "y": 965,
                    "width": 700,
                    "height": 35,
                    "fontSize": 18,
                    "color": "#888888",
                    "align": "center",
                },
            ],
            "decorations": [
                # Soft drop shadow on product
                {
                    "type": "shadow",
                    "offsetX": 0,
                    "offsetY": 8,
                    "blur": 25,
                    "color": "rgba(0,0,0,0.10)",
                },
                # Subtle accent line above title
                {
                    "type": "line",
                    "x1": 350,
                    "y1": 875,
                    "x2": 550,
                    "y2": 875,
                    "color": "#E0E0E0",
                    "width": 2,
                },
                # Bottom decorative bar
                {
                    "type": "rect",
                    "x": 0,
                    "y": 1160,
                    "width": 900,
                    "height": 40,
                    "fill": "#F5F5F5",
                    "rx": 0,
                    "ry": 0,
                },
            ],
        },
    },
    # ──────────────────────────────────────────────────────────────
    # 2. Инфографика: характеристики (Infographic Features)
    #    Light gradient bg, product LEFT 55%, features RIGHT
    #    as styled pills with green checkmark circles.
    #    Title at bottom, vertical divider between sections.
    # ──────────────────────────────────────────────────────────────
    {
        "name": "Инфографика: характеристики",
        "slug": "info-features",
        "category": "infographic",
        "is_premium": False,
        "marketplace": ["wb", "ozon"],
        "sort_order": 2,
        "preview_url": "/static/templates/info-features.svg",
        "config": {
            "background": {"type": "gradient", "from": "#F8F9FA", "to": "#FFFFFF"},
            "product_area": {"x": 30, "y": 60, "width": 480, "height": 680},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 30,
                    "y": 800,
                    "width": 840,
                    "height": 50,
                    "fontSize": 28,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "left",
                },
                {
                    "id": "feature1",
                    "label": "Характеристика 1",
                    "x": 590,
                    "y": 115,
                    "width": 260,
                    "height": 30,
                    "fontSize": 16,
                    "fontWeight": "bold",
                    "color": "#2D2D2D",
                    "align": "left",
                },
                {
                    "id": "feature2",
                    "label": "Характеристика 2",
                    "x": 590,
                    "y": 255,
                    "width": 260,
                    "height": 30,
                    "fontSize": 16,
                    "fontWeight": "bold",
                    "color": "#2D2D2D",
                    "align": "left",
                },
                {
                    "id": "feature3",
                    "label": "Характеристика 3",
                    "x": 590,
                    "y": 395,
                    "width": 260,
                    "height": 30,
                    "fontSize": 16,
                    "fontWeight": "bold",
                    "color": "#2D2D2D",
                    "align": "left",
                },
                {
                    "id": "feature4",
                    "label": "Характеристика 4",
                    "x": 590,
                    "y": 535,
                    "width": 260,
                    "height": 30,
                    "fontSize": 16,
                    "fontWeight": "bold",
                    "color": "#2D2D2D",
                    "align": "left",
                },
            ],
            "decorations": [
                # Vertical divider
                {
                    "type": "line",
                    "x1": 530,
                    "y1": 60,
                    "x2": 530,
                    "y2": 750,
                    "color": "#E8E8E8",
                    "width": 1,
                },
                # Feature pill backgrounds (rounded rects)
                {
                    "type": "rect",
                    "x": 545,
                    "y": 90,
                    "width": 325,
                    "height": 80,
                    "fill": "#F0FAF0",
                    "rx": 12,
                    "ry": 12,
                    "stroke": "#D4EED4",
                    "strokeWidth": 1,
                },
                {
                    "type": "rect",
                    "x": 545,
                    "y": 230,
                    "width": 325,
                    "height": 80,
                    "fill": "#F0FAF0",
                    "rx": 12,
                    "ry": 12,
                    "stroke": "#D4EED4",
                    "strokeWidth": 1,
                },
                {
                    "type": "rect",
                    "x": 545,
                    "y": 370,
                    "width": 325,
                    "height": 80,
                    "fill": "#F0FAF0",
                    "rx": 12,
                    "ry": 12,
                    "stroke": "#D4EED4",
                    "strokeWidth": 1,
                },
                {
                    "type": "rect",
                    "x": 545,
                    "y": 510,
                    "width": 325,
                    "height": 80,
                    "fill": "#F0FAF0",
                    "rx": 12,
                    "ry": 12,
                    "stroke": "#D4EED4",
                    "strokeWidth": 1,
                },
                # Green checkmark circles inside pills
                {
                    "type": "circle_icon",
                    "x": 565,
                    "y": 130,
                    "radius": 14,
                    "fill": "#4CAF50",
                    "icon": "\u2713",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 16,
                },
                {
                    "type": "circle_icon",
                    "x": 565,
                    "y": 270,
                    "radius": 14,
                    "fill": "#4CAF50",
                    "icon": "\u2713",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 16,
                },
                {
                    "type": "circle_icon",
                    "x": 565,
                    "y": 410,
                    "radius": 14,
                    "fill": "#4CAF50",
                    "icon": "\u2713",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 16,
                },
                {
                    "type": "circle_icon",
                    "x": 565,
                    "y": 550,
                    "radius": 14,
                    "fill": "#4CAF50",
                    "icon": "\u2713",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 16,
                },
                # Bottom title background strip
                {
                    "type": "rect",
                    "x": 0,
                    "y": 775,
                    "width": 900,
                    "height": 100,
                    "fill": "#FFFFFF",
                    "rx": 0,
                    "ry": 0,
                    "opacity": 0.9,
                },
                # Top accent line
                {
                    "type": "line",
                    "x1": 0,
                    "y1": 775,
                    "x2": 900,
                    "y2": 775,
                    "color": "#4CAF50",
                    "width": 3,
                },
            ],
        },
    },
    # ──────────────────────────────────────────────────────────────
    # 3. Лайфстайл: мягкие тени (Lifestyle Soft Shadows)
    #    Warm beige/cream background, product centred with
    #    prominent soft shadow, elegant title, muted subtitle.
    #    Minimalist premium feel.
    # ──────────────────────────────────────────────────────────────
    {
        "name": "Лайфстайл: мягкие тени",
        "slug": "lifestyle-shadow",
        "category": "lifestyle",
        "is_premium": False,
        "marketplace": ["wb", "ozon"],
        "sort_order": 3,
        "preview_url": "/static/templates/lifestyle-shadow.svg",
        "config": {
            "background": {"type": "gradient", "from": "#F5F0EB", "to": "#EDE7E0"},
            "product_area": {"x": 115, "y": 80, "width": 670, "height": 740},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 60,
                    "y": 880,
                    "width": 780,
                    "height": 55,
                    "fontSize": 30,
                    "fontWeight": "bold",
                    "color": "#2C2C2C",
                    "align": "center",
                },
                {
                    "id": "subtitle",
                    "label": "Описание или слоган",
                    "x": 120,
                    "y": 945,
                    "width": 660,
                    "height": 35,
                    "fontSize": 17,
                    "color": "#8C8278",
                    "align": "center",
                },
            ],
            "decorations": [
                # Product drop shadow — large and soft for lifestyle feel
                {
                    "type": "shadow",
                    "offsetX": 0,
                    "offsetY": 15,
                    "blur": 40,
                    "color": "rgba(0,0,0,0.15)",
                },
                # Top decorative thin line
                {
                    "type": "line",
                    "x1": 200,
                    "y1": 40,
                    "x2": 700,
                    "y2": 40,
                    "color": "#D4CBC2",
                    "width": 1,
                },
                # Bottom decorative thin line
                {
                    "type": "line",
                    "x1": 200,
                    "y1": 1010,
                    "x2": 700,
                    "y2": 1010,
                    "color": "#D4CBC2",
                    "width": 1,
                },
                # Elegant oval/pill behind title area
                {
                    "type": "rect",
                    "x": 180,
                    "y": 868,
                    "width": 540,
                    "height": 70,
                    "fill": "rgba(255,255,255,0.45)",
                    "rx": 35,
                    "ry": 35,
                },
                # Corner accent — top-left
                {
                    "type": "rect",
                    "x": 30,
                    "y": 30,
                    "width": 50,
                    "height": 2,
                    "fill": "#C4B8AC",
                    "rx": 1,
                    "ry": 1,
                },
                {
                    "type": "rect",
                    "x": 30,
                    "y": 30,
                    "width": 2,
                    "height": 50,
                    "fill": "#C4B8AC",
                    "rx": 1,
                    "ry": 1,
                },
                # Corner accent — bottom-right
                {
                    "type": "rect",
                    "x": 820,
                    "y": 1148,
                    "width": 50,
                    "height": 2,
                    "fill": "#C4B8AC",
                    "rx": 1,
                    "ry": 1,
                },
                {
                    "type": "rect",
                    "x": 868,
                    "y": 1100,
                    "width": 2,
                    "height": 50,
                    "fill": "#C4B8AC",
                    "rx": 1,
                    "ry": 1,
                },
            ],
        },
    },
    # ──────────────────────────────────────────────────────────────
    # 4. Инфографика: бейдж ХИТ (Infographic with Hit Badge)
    #    White bg, product centred, bold red "ХИТ ПРОДАЖ" badge
    #    top-right, title centred, feature bullets as styled
    #    horizontal chips below title.
    # ──────────────────────────────────────────────────────────────
    {
        "name": "Инфографика: бейдж ХИТ",
        "slug": "info-badge-hit",
        "category": "infographic",
        "is_premium": False,
        "marketplace": ["wb", "ozon"],
        "sort_order": 4,
        "preview_url": "/static/templates/info-badge-hit.svg",
        "config": {
            "background": {"type": "solid", "color": "#FFFFFF"},
            "product_area": {"x": 100, "y": 100, "width": 700, "height": 680},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 50,
                    "y": 830,
                    "width": 800,
                    "height": 50,
                    "fontSize": 30,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                },
                {
                    "id": "feature1",
                    "label": "Особенность 1",
                    "x": 60,
                    "y": 935,
                    "width": 240,
                    "height": 30,
                    "fontSize": 14,
                    "fontWeight": "bold",
                    "color": "#444444",
                    "align": "center",
                },
                {
                    "id": "feature2",
                    "label": "Особенность 2",
                    "x": 330,
                    "y": 935,
                    "width": 240,
                    "height": 30,
                    "fontSize": 14,
                    "fontWeight": "bold",
                    "color": "#444444",
                    "align": "center",
                },
                {
                    "id": "feature3",
                    "label": "Особенность 3",
                    "x": 600,
                    "y": 935,
                    "width": 240,
                    "height": 30,
                    "fontSize": 14,
                    "fontWeight": "bold",
                    "color": "#444444",
                    "align": "center",
                },
            ],
            "decorations": [
                # "ХИТ ПРОДАЖ" badge — top-right, rotated feel via position
                {
                    "type": "badge",
                    "text": "ХИТ ПРОДАЖ",
                    "x": 680,
                    "y": 25,
                    "width": 190,
                    "height": 50,
                    "bg": "#FF3B30",
                    "color": "#FFFFFF",
                    "fontSize": 18,
                    "borderRadius": 10,
                },
                # Red top accent strip
                {
                    "type": "rect",
                    "x": 0,
                    "y": 0,
                    "width": 900,
                    "height": 6,
                    "fill": "#FF3B30",
                    "rx": 0,
                    "ry": 0,
                },
                # Divider between title and features
                {
                    "type": "line",
                    "x1": 100,
                    "y1": 900,
                    "x2": 800,
                    "y2": 900,
                    "color": "#EEEEEE",
                    "width": 1,
                },
                # Feature chip backgrounds (3 horizontal pills)
                {
                    "type": "rect",
                    "x": 50,
                    "y": 920,
                    "width": 260,
                    "height": 60,
                    "fill": "#FFF5F5",
                    "rx": 10,
                    "ry": 10,
                    "stroke": "#FFDDDD",
                    "strokeWidth": 1,
                },
                {
                    "type": "rect",
                    "x": 320,
                    "y": 920,
                    "width": 260,
                    "height": 60,
                    "fill": "#FFF5F5",
                    "rx": 10,
                    "ry": 10,
                    "stroke": "#FFDDDD",
                    "strokeWidth": 1,
                },
                {
                    "type": "rect",
                    "x": 590,
                    "y": 920,
                    "width": 260,
                    "height": 60,
                    "fill": "#FFF5F5",
                    "rx": 10,
                    "ry": 10,
                    "stroke": "#FFDDDD",
                    "strokeWidth": 1,
                },
                # Star icons inside feature chips
                {
                    "type": "circle_icon",
                    "x": 75,
                    "y": 950,
                    "radius": 10,
                    "fill": "#FF3B30",
                    "icon": "\u2605",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 12,
                },
                {
                    "type": "circle_icon",
                    "x": 345,
                    "y": 950,
                    "radius": 10,
                    "fill": "#FF3B30",
                    "icon": "\u2605",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 12,
                },
                {
                    "type": "circle_icon",
                    "x": 615,
                    "y": 950,
                    "radius": 10,
                    "fill": "#FF3B30",
                    "icon": "\u2605",
                    "iconColor": "#FFFFFF",
                    "iconFontSize": 12,
                },
                # Bottom bar
                {
                    "type": "rect",
                    "x": 0,
                    "y": 1160,
                    "width": 900,
                    "height": 40,
                    "fill": "#FFF5F5",
                    "rx": 0,
                    "ry": 0,
                },
            ],
        },
    },
    # ──────────────────────────────────────────────────────────────
    # 5. Коллаж: 2 ракурса (Collage — 2 angles) — PREMIUM
    #    White bg with subtle grid dots, TWO product areas
    #    side by side, title centred below, clean divider.
    # ──────────────────────────────────────────────────────────────
    {
        "name": "Коллаж: 2 ракурса",
        "slug": "collage-two",
        "category": "collage",
        "is_premium": True,
        "marketplace": ["wb", "ozon"],
        "sort_order": 5,
        "preview_url": "/static/templates/collage-two.svg",
        "config": {
            "background": {"type": "solid", "color": "#FAFAFA"},
            "product_area": {"x": 30, "y": 60, "width": 410, "height": 680},
            "product_area_2": {"x": 460, "y": 60, "width": 410, "height": 680},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 50,
                    "y": 810,
                    "width": 800,
                    "height": 55,
                    "fontSize": 28,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                },
                {
                    "id": "subtitle",
                    "label": "Описание или артикул",
                    "x": 100,
                    "y": 875,
                    "width": 700,
                    "height": 30,
                    "fontSize": 16,
                    "color": "#999999",
                    "align": "center",
                },
                {
                    "id": "label_left",
                    "label": "Ракурс 1",
                    "x": 100,
                    "y": 755,
                    "width": 260,
                    "height": 25,
                    "fontSize": 13,
                    "color": "#AAAAAA",
                    "align": "center",
                },
                {
                    "id": "label_right",
                    "label": "Ракурс 2",
                    "x": 530,
                    "y": 755,
                    "width": 260,
                    "height": 25,
                    "fontSize": 13,
                    "color": "#AAAAAA",
                    "align": "center",
                },
            ],
            "decorations": [
                # Vertical centre divider (dashed feel via two segments)
                {
                    "type": "line",
                    "x1": 450,
                    "y1": 80,
                    "x2": 450,
                    "y2": 740,
                    "color": "#E0E0E0",
                    "width": 1,
                },
                # Left image frame
                {
                    "type": "rect",
                    "x": 25,
                    "y": 55,
                    "width": 420,
                    "height": 690,
                    "fill": "rgba(0,0,0,0)",
                    "rx": 8,
                    "ry": 8,
                    "stroke": "#E8E8E8",
                    "strokeWidth": 1,
                },
                # Right image frame
                {
                    "type": "rect",
                    "x": 455,
                    "y": 55,
                    "width": 420,
                    "height": 690,
                    "fill": "rgba(0,0,0,0)",
                    "rx": 8,
                    "ry": 8,
                    "stroke": "#E8E8E8",
                    "strokeWidth": 1,
                },
                # Shadow on product images
                {
                    "type": "shadow",
                    "offsetX": 0,
                    "offsetY": 4,
                    "blur": 15,
                    "color": "rgba(0,0,0,0.08)",
                },
                # Title background strip
                {
                    "type": "rect",
                    "x": 0,
                    "y": 790,
                    "width": 900,
                    "height": 130,
                    "fill": "#FFFFFF",
                    "rx": 0,
                    "ry": 0,
                },
                # Top accent line
                {
                    "type": "line",
                    "x1": 0,
                    "y1": 790,
                    "x2": 900,
                    "y2": 790,
                    "color": "#E0E0E0",
                    "width": 1,
                },
                # "PREMIUM" small label top-left corner
                {
                    "type": "rect",
                    "x": 0,
                    "y": 0,
                    "width": 900,
                    "height": 4,
                    "fill": "#1A1A1A",
                    "rx": 0,
                    "ry": 0,
                },
                # Bottom bar
                {
                    "type": "rect",
                    "x": 0,
                    "y": 1196,
                    "width": 900,
                    "height": 4,
                    "fill": "#1A1A1A",
                    "rx": 0,
                    "ry": 0,
                },
            ],
        },
    },
]


async def seed_templates(force_update: bool = False) -> None:
    """Insert or update seed templates.

    By default, existing templates are skipped.  Pass ``force_update=True``
    (or ``--update`` on the CLI) to overwrite existing rows with fresh configs.
    """
    async with AsyncSessionLocal() as session:
        for tmpl_data in SEED_TEMPLATES:
            result = await session.execute(
                text("SELECT id FROM templates WHERE slug = :slug"),
                {"slug": tmpl_data["slug"]},
            )
            existing_id = result.scalar()

            if existing_id is not None:
                if force_update:
                    await session.execute(
                        text(
                            "UPDATE templates SET name=:name, category=:category, "
                            "is_premium=:is_premium, marketplace=:marketplace, "
                            "sort_order=:sort_order, preview_url=:preview_url, "
                            "config=:config WHERE slug=:slug"
                        ),
                        {
                            "name": tmpl_data["name"],
                            "category": tmpl_data["category"],
                            "is_premium": tmpl_data["is_premium"],
                            "marketplace": tmpl_data["marketplace"],
                            "sort_order": tmpl_data["sort_order"],
                            "preview_url": tmpl_data["preview_url"],
                            "config": json.dumps(tmpl_data["config"]),
                            "slug": tmpl_data["slug"],
                        },
                    )
                    print(f"  Updated template: {tmpl_data['slug']}")
                else:
                    print(f"  Template '{tmpl_data['slug']}' already exists, skipping.")
                continue

            template = Template(
                name=tmpl_data["name"],
                slug=tmpl_data["slug"],
                category=tmpl_data["category"],
                is_premium=tmpl_data["is_premium"],
                marketplace=tmpl_data["marketplace"],
                sort_order=tmpl_data["sort_order"],
                preview_url=tmpl_data["preview_url"],
                config=tmpl_data["config"],
            )
            session.add(template)
            print(f"  Seeded template: {tmpl_data['slug']}")

        await session.commit()
    print("Template seeding complete.")


if __name__ == "__main__":
    import sys

    update = "--update" in sys.argv
    asyncio.run(seed_templates(force_update=update))
