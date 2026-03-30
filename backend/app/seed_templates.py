"""Seed script for 5 MVP templates from SPECIFICATION.md.

Usage:
    python -m app.seed_templates

Idempotent: checks slug existence before inserting (skips duplicates).
"""
import asyncio

from sqlalchemy import text

from app.database import AsyncSessionLocal
from app.models.template import Template


SEED_TEMPLATES = [
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
            "product_area": {"x": 100, "y": 50, "width": 700, "height": 800},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название товара",
                    "x": 50,
                    "y": 880,
                    "width": 800,
                    "height": 50,
                    "fontSize": 28,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                }
            ],
        },
    },
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
            "product_area": {"x": 50, "y": 50, "width": 500, "height": 700},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название",
                    "x": 50,
                    "y": 780,
                    "width": 800,
                    "height": 40,
                    "fontSize": 24,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "left",
                },
                {
                    "id": "feature1",
                    "label": "Характеристика 1",
                    "x": 570,
                    "y": 100,
                    "width": 280,
                    "height": 30,
                    "fontSize": 16,
                    "color": "#333333",
                    "align": "left",
                },
                {
                    "id": "feature2",
                    "label": "Характеристика 2",
                    "x": 570,
                    "y": 200,
                    "width": 280,
                    "height": 30,
                    "fontSize": 16,
                    "color": "#333333",
                    "align": "left",
                },
                {
                    "id": "feature3",
                    "label": "Характеристика 3",
                    "x": 570,
                    "y": 300,
                    "width": 280,
                    "height": 30,
                    "fontSize": 16,
                    "color": "#333333",
                    "align": "left",
                },
            ],
            "decorations": [
                {
                    "type": "line",
                    "x1": 560,
                    "y1": 80,
                    "x2": 560,
                    "y2": 750,
                    "color": "#E0E0E0",
                    "width": 1,
                }
            ],
        },
    },
    {
        "name": "Лайфстайл: мягкие тени",
        "slug": "lifestyle-shadow",
        "category": "lifestyle",
        "is_premium": False,
        "marketplace": ["wb", "ozon"],
        "sort_order": 3,
        "preview_url": "/static/templates/lifestyle-shadow.svg",
        "config": {
            "background": {"type": "solid", "color": "#F5F0EB"},
            "product_area": {"x": 100, "y": 80, "width": 700, "height": 750},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название",
                    "x": 50,
                    "y": 870,
                    "width": 800,
                    "height": 50,
                    "fontSize": 26,
                    "fontWeight": "bold",
                    "color": "#2C2C2C",
                    "align": "center",
                },
                {
                    "id": "subtitle",
                    "label": "Подзаголовок",
                    "x": 100,
                    "y": 930,
                    "width": 700,
                    "height": 30,
                    "fontSize": 16,
                    "color": "#888888",
                    "align": "center",
                },
            ],
            "decorations": [
                {
                    "type": "shadow",
                    "offsetX": 10,
                    "offsetY": 15,
                    "blur": 30,
                    "color": "rgba(0,0,0,0.15)",
                }
            ],
        },
    },
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
            "product_area": {"x": 80, "y": 80, "width": 740, "height": 700},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название",
                    "x": 50,
                    "y": 810,
                    "width": 800,
                    "height": 45,
                    "fontSize": 26,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                },
                {
                    "id": "features",
                    "label": "Характеристики (через \\n)",
                    "x": 50,
                    "y": 870,
                    "width": 800,
                    "height": 120,
                    "fontSize": 16,
                    "color": "#555555",
                    "align": "center",
                },
            ],
            "decorations": [
                {
                    "type": "badge",
                    "text": "ХИТ",
                    "x": 720,
                    "y": 20,
                    "width": 140,
                    "height": 45,
                    "bg": "#FF3B30",
                    "color": "#FFFFFF",
                    "fontSize": 20,
                    "borderRadius": 8,
                }
            ],
        },
    },
    {
        "name": "Коллаж: 2 ракурса",
        "slug": "collage-two",
        "category": "collage",
        "is_premium": True,
        "marketplace": ["wb", "ozon"],
        "sort_order": 5,
        "preview_url": "/static/templates/collage-two.svg",
        "config": {
            "background": {"type": "solid", "color": "#FFFFFF"},
            "product_area": {"x": 30, "y": 50, "width": 420, "height": 700},
            "product_area_2": {"x": 470, "y": 50, "width": 420, "height": 700},
            "text_areas": [
                {
                    "id": "title",
                    "label": "Название",
                    "x": 50,
                    "y": 780,
                    "width": 800,
                    "height": 50,
                    "fontSize": 24,
                    "fontWeight": "bold",
                    "color": "#1A1A1A",
                    "align": "center",
                }
            ],
        },
    },
]


async def seed_templates() -> None:
    """Insert seed templates. Idempotent via slug existence check."""
    async with AsyncSessionLocal() as session:
        for tmpl_data in SEED_TEMPLATES:
            result = await session.execute(
                text("SELECT id FROM templates WHERE slug = :slug"),
                {"slug": tmpl_data["slug"]},
            )
            if result.scalar() is not None:
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
    asyncio.run(seed_templates())
