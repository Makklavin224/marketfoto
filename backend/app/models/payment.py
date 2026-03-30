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


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "type IN ('subscription', 'one_time')",
            name="type_check",
        ),
        CheckConstraint(
            "plan IN ('starter', 'business', 'starter_annual', 'business_annual')",
            name="plan_check",
        ),
        CheckConstraint(
            "status IN ('pending', 'waiting_for_capture', 'succeeded', 'canceled', 'refunded')",
            name="status_check",
        ),
        Index("idx_payments_user_id", "user_id"),
        Index("idx_payments_status", "status"),
        Index("idx_payments_yookassa_id", "yookassa_payment_id"),
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
    yookassa_payment_id: Mapped[Optional[str]] = mapped_column(
        sa.String, unique=True, nullable=True
    )
    type: Mapped[str] = mapped_column(sa.String, nullable=False)
    plan: Mapped[Optional[str]] = mapped_column(sa.String, nullable=True)
    amount: Mapped[int] = mapped_column(
        sa.Integer, nullable=False, comment="kopecks"
    )
    currency: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default="RUB"
    )
    status: Mapped[str] = mapped_column(
        sa.String, nullable=False, server_default="pending"
    )
    yookassa_confirmation_url: Mapped[Optional[str]] = mapped_column(
        sa.String, nullable=True
    )
    metadata_: Mapped[Optional[Dict]] = mapped_column(
        "metadata", JSONB, server_default=text("'{}'")
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
