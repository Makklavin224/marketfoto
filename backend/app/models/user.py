from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import sqlalchemy as sa
from sqlalchemy import CheckConstraint, Index, text
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "plan IN ('free', 'starter', 'business')",
            name="plan_check",
        ),
        Index("idx_users_email", "email"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        pg.UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    email: Mapped[str] = mapped_column(sa.String, unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(sa.String, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    plan: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default="free"
    )
    credits_remaining: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, server_default=text("3")
    )
    credits_reset_at: Mapped[Optional[datetime]] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=text("now() + interval '30 days'"),
    )
    subscription_expires_at: Mapped[Optional[datetime]] = mapped_column(
        sa.DateTime(timezone=True), nullable=True
    )
    subscription_yookassa_id: Mapped[Optional[str]] = mapped_column(
        sa.String, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=sa.func.now(),
    )
