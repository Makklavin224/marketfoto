"""Dashboard router: stats endpoint for the user dashboard."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select

from app.api.deps import get_current_user
from app.database import AsyncSessionLocal
from app.models.render import Render
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

# Credits total per plan: free=3, starter=50, business=999 (unlimited)
PLAN_CREDITS_TOTAL = {
    "free": 3,
    "starter": 50,
    "business": 999,
}


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    user: User = Depends(get_current_user),
) -> DashboardStatsResponse:
    """Return dashboard statistics for the authenticated user (D-01, D-05, DASH-01).

    Includes plan info, credit balance, and render counts (total + this month).
    """
    # Calculate first day of current month (UTC)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    async with AsyncSessionLocal() as session:
        # Total renders by this user
        total_result = await session.execute(
            select(func.count()).select_from(Render).where(
                Render.user_id == user.id
            )
        )
        renders_total = total_result.scalar() or 0

        # Renders this month
        month_result = await session.execute(
            select(func.count()).select_from(Render).where(
                Render.user_id == user.id,
                Render.created_at >= month_start,
            )
        )
        renders_this_month = month_result.scalar() or 0

    # Derive credits_total from plan
    credits_total = PLAN_CREDITS_TOTAL.get(user.plan, 3)

    # Format subscription_expires_at as ISO string
    sub_expires: str | None = None
    if user.subscription_expires_at is not None:
        sub_expires = user.subscription_expires_at.isoformat()

    return DashboardStatsResponse(
        plan=user.plan,
        credits_remaining=user.credits_remaining,
        credits_total=credits_total,
        renders_this_month=renders_this_month,
        renders_total=renders_total,
        subscription_expires_at=sub_expires,
    )
