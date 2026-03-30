from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, ForeignKey, Index, text
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Image(Base):
    __tablename__ = "images"
    __table_args__ = (
        CheckConstraint(
            "status IN ('uploaded', 'processing', 'processed', 'failed')",
            name="status_check",
        ),
        Index("idx_images_user_id", "user_id"),
        Index("idx_images_status", "status"),
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
    original_url: Mapped[str] = mapped_column(sa.String, nullable=False)
    original_filename: Mapped[str] = mapped_column(sa.String, nullable=False)
    original_size: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, comment="bytes"
    )
    original_width: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    original_height: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    processed_url: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    status: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default="uploaded"
    )
    error_message: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(
        sa.Integer, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
