"""AI Photoshoot render model — tracks Gemini-generated product photography."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, ForeignKey, Index, text
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AIPhotoshoot(Base):
    __tablename__ = "ai_photoshoots"
    __table_args__ = (
        CheckConstraint(
            "marketplace IN ('wb', 'ozon', 'ym')",
            name="ai_ps_marketplace_check",
        ),
        CheckConstraint(
            "style IN ('studio', 'lifestyle', 'minimal', 'creative', 'infographic')",
            name="ai_ps_style_check",
        ),
        CheckConstraint(
            "status IN ('pending', 'generating', 'complete', 'failed')",
            name="ai_ps_status_check",
        ),
        Index("idx_ai_photoshoots_user_id", "user_id"),
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
    style: Mapped[str] = mapped_column(sa.String, nullable=False)
    marketplace: Mapped[str] = mapped_column(sa.String, nullable=False)
    output_url: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    output_width: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    output_height: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default=text("'pending'")
    )
    error_message: Mapped[Optional[str]] = mapped_column(
        sa.String, nullable=True
    )
    processing_time_ms: Mapped[Optional[int]] = mapped_column(
        sa.Integer, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
