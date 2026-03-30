from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class CreatePaymentRequest(BaseModel):
    variant: Literal[
        "starter", "business", "starter_annual", "business_annual", "one_time"
    ]


class CreatePaymentResponse(BaseModel):
    payment_id: UUID
    confirmation_url: str


class PaymentResponse(BaseModel):
    id: UUID
    type: str
    plan: str | None
    amount: int
    currency: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
