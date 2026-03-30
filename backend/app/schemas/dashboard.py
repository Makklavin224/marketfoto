"""Pydantic response models for the dashboard stats endpoint."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    """User dashboard statistics (D-01, DASH-01)."""

    plan: str  # 'free', 'starter', 'business'
    credits_remaining: int  # current credits left
    credits_total: int  # total credits for plan (free=3, starter=50, business=999)
    renders_this_month: int  # renders created_at >= first day of current month
    renders_total: int  # total renders by this user
    subscription_expires_at: Optional[str] = None  # ISO datetime string or None

    model_config = {"from_attributes": True}
