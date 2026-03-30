"""
Daily subscription expiration cleanup.

Run daily via cron:
  0 3 * * * cd /app && python -m app.services.subscription_cron >> /var/log/subscription_cron.log 2>&1

Or via Docker:
  docker compose exec backend python -m app.services.subscription_cron

Reverts expired subscriptions to free plan with 3 credits (PAY-10).
"""

from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone

from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import Session

from app.config import settings
from app.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


def expire_subscriptions() -> int:
    """
    Find all users whose subscription has expired and revert them to the free plan.

    Returns the count of expired users.
    """
    # Use synchronous engine for simplicity in cron context
    sync_url = settings.database_url.replace(
        "postgresql+asyncpg://", "postgresql://"
    ).replace("postgresql://", "postgresql://")
    engine = create_engine(sync_url)

    count = 0
    now = datetime.now(timezone.utc)

    with Session(engine) as session:
        # Find expired subscriptions
        result = session.execute(
            select(User.id, User.email, User.plan, User.subscription_expires_at).where(
                User.subscription_expires_at < now,
                User.plan != "free",
            )
        )
        expired_users = result.all()

        for user_id, email, plan, expires_at in expired_users:
            session.execute(
                update(User)
                .where(User.id == user_id)
                .values(
                    plan="free",
                    credits_remaining=3,
                    subscription_expires_at=None,
                    subscription_yookassa_id=None,
                )
            )
            logger.info(
                "Expired subscription for user %s: %s -> free (was active until %s)",
                email,
                plan,
                expires_at,
            )
            count += 1

        if count > 0:
            session.commit()

    engine.dispose()
    return count


if __name__ == "__main__":
    logger.info("Starting subscription expiration check...")
    expired_count = expire_subscriptions()
    logger.info("Expired %d subscription(s)", expired_count)
