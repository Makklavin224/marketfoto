from __future__ import annotations

import uuid
from datetime import datetime
from typing import Dict, Optional

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, ForeignKey, Index, text
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Render(Base):
    __tablename__ = "renders"
    __table_args__ = (
        CheckConstraint(
            "marketplace IN ('wb', 'ozon', 'ym')",
            name="marketplace_check",
        ),
        Index("idx_renders_user_id", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        ForeignKey("templates.id"),
        nullable=False,
    )
    overlay_data: Mapped[Dict] = mapped_column(JSONB, nullable=False)
    marketplace: Mapped[str] = mapped_column(sa.String, nullable=False)
    output_url: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    output_width: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    output_height: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
