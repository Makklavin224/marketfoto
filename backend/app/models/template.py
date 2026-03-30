from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, List

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, Index, text
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (
        CheckConstraint(
            "category IN ('white_bg', 'infographic', 'lifestyle', 'collage')",
            name="category_check",
        ),
        Index("idx_templates_category", "category"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    name: Mapped[str] = mapped_column(sa.String, nullable=False)
    slug: Mapped[str] = mapped_column(sa.String, unique=True, nullable=False)
    category: Mapped[str] = mapped_column(sa.String, nullable=False)
    preview_url: Mapped[str] = mapped_column(sa.String, nullable=False)
    config: Mapped[Dict] = mapped_column(JSONB, nullable=False)
    marketplace: Mapped[List[str]] = mapped_column(
        ARRAY(sa.String),
        nullable=False,
        server_default=text("'{wb,ozon}'"),
    )
    is_premium: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=text("false")
    )
    sort_order: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default=text("0")
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
