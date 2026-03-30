"""
YooKassa payment integration service.

Handles payment creation via YooKassa SDK, webhook processing with idempotency,
and credit/plan updates for successful payments.

Atomic credit deduction pattern for Phase 7 (render endpoint):
    UPDATE users SET credits_remaining = credits_remaining - 1
    WHERE id = :uid AND credits_remaining > 0
    RETURNING credits_remaining
If RETURNING yields no rows, credits were insufficient -- reject the request.
"""

from __future__ import annotations

import ipaddress
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

import sqlalchemy as sa
from yookassa import Configuration, Payment as YooKassaPayment

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.payment import Payment
from app.models.user import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Plan configuration: variant -> details (D-02)
# Amounts are in kopecks (1 RUB = 100 kopecks)
# ---------------------------------------------------------------------------
PLAN_CONFIG: dict[str, dict[str, Any]] = {
    "starter": {
        "type": "subscription",
        "plan": "starter",
        "amount": 49900,
        "credits": 50,
        "period_days": 30,
        "description": "Starter - 50 карточек/мес",
    },
    "business": {
        "type": "subscription",
        "plan": "business",
        "amount": 99000,
        "credits": 200,
        "period_days": 30,
        "description": "Business - 200 карточек/мес",
    },
    "starter_annual": {
        "type": "subscription",
        "plan": "starter_annual",
        "amount": 399000,
        "credits": 50,
        "period_days": 365,
        "description": "Starter годовой",
    },
    "business_annual": {
        "type": "subscription",
        "plan": "business_annual",
        "amount": 790000,
        "credits": 200,
        "period_days": 365,
        "description": "Business годовой",
    },
    "one_time": {
        "type": "one_time",
        "plan": None,
        "amount": 4900,
        "credits": 1,
        "period_days": 0,
        "description": "1 карточка",
    },
}

# ---------------------------------------------------------------------------
# YooKassa IP whitelist (D-03, D-05, Pitfall 9)
# https://yookassa.ru/developers/using-api/webhooks#ip
# ---------------------------------------------------------------------------
YOOKASSA_IP_RANGES: list[str] = [
    "185.71.76.0/27",
    "185.71.77.0/27",
    "77.75.153.0/25",
    "77.75.156.11",
    "77.75.156.35",
    "77.75.154.128/25",
    "2a02:5180::/32",
]

_parsed_networks: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []


def _get_networks() -> list[ipaddress.IPv4Network | ipaddress.IPv6Network]:
    """Lazily parse IP ranges into network objects (cached after first call)."""
    if not _parsed_networks:
        for cidr in YOOKASSA_IP_RANGES:
            _parsed_networks.append(ipaddress.ip_network(cidr, strict=False))
    return _parsed_networks


def check_ip_whitelist(ip: str) -> bool:
    """Check if the given IP address is within YooKassa's allowed ranges."""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for network in _get_networks():
        if addr in network:
            return True
    return False


def _configure_yookassa() -> None:
    """Set up YooKassa SDK credentials from app settings."""
    Configuration.account_id = settings.yookassa_shop_id
    Configuration.secret_key = settings.yookassa_secret_key


async def create_yookassa_payment(
    user_id: UUID, variant: str, return_url: str
) -> tuple[Payment, str]:
    """
    Create a YooKassa payment and persist a Payment record in the DB.

    Returns (payment_record, confirmation_url).
    """
    config = PLAN_CONFIG[variant]
    _configure_yookassa()

    # Amount in RUB string (YooKassa expects "499.00" format)
    amount_rub = f"{config['amount'] / 100:.2f}"

    yookassa_response = YooKassaPayment.create(
        {
            "amount": {"value": amount_rub, "currency": "RUB"},
            "confirmation": {"type": "redirect", "return_url": return_url},
            "capture": True,
            "description": config["description"],
            "metadata": {
                "user_id": str(user_id),
                "variant": variant,
            },
        },
        uuid.uuid4(),  # idempotency key
    )

    confirmation_url = yookassa_response.confirmation.confirmation_url

    async with AsyncSessionLocal() as session:
        payment = Payment(
            user_id=user_id,
            yookassa_payment_id=yookassa_response.id,
            type=config["type"],
            plan=config["plan"],
            amount=config["amount"],
            currency="RUB",
            status="pending",
            yookassa_confirmation_url=confirmation_url,
            metadata_={
                "variant": variant,
                "yookassa_status": yookassa_response.status,
            },
        )
        session.add(payment)
        await session.commit()
        await session.refresh(payment)

    return payment, confirmation_url


async def process_webhook(payload: dict) -> bool:
    """
    Process a YooKassa webhook notification.

    Only handles 'payment.succeeded' events. Implements idempotency by checking
    if the payment has already been marked as succeeded.

    Returns True on success (or if event is silently ignored).
    """
    event_type = payload.get("event")
    if event_type != "payment.succeeded":
        logger.info("Ignoring webhook event: %s", event_type)
        return True

    payment_object = payload.get("object", {})
    yookassa_payment_id = payment_object.get("id")
    if not yookassa_payment_id:
        logger.warning("Webhook payload missing payment id")
        return False

    metadata = payment_object.get("metadata", {})
    variant = metadata.get("variant")
    user_id_str = metadata.get("user_id")

    if not variant or not user_id_str:
        logger.warning(
            "Webhook payload missing variant/user_id in metadata: %s",
            yookassa_payment_id,
        )
        return False

    async with AsyncSessionLocal() as session:
        # ---- Idempotency check (D-05, Pitfall 9) ----
        result = await session.execute(
            sa.select(Payment).where(
                Payment.yookassa_payment_id == yookassa_payment_id,
                Payment.status == "succeeded",
            )
        )
        if result.scalar_one_or_none() is not None:
            logger.info(
                "Duplicate webhook for already-succeeded payment %s -- skipping",
                yookassa_payment_id,
            )
            return True

        # ---- Update payment record ----
        result = await session.execute(
            sa.select(Payment).where(
                Payment.yookassa_payment_id == yookassa_payment_id
            )
        )
        payment = result.scalar_one_or_none()
        if payment is None:
            logger.warning(
                "No Payment record found for yookassa_payment_id=%s",
                yookassa_payment_id,
            )
            return False

        payment.status = "succeeded"

        # ---- Update user plan/credits ----
        config = PLAN_CONFIG.get(variant)
        if config is None:
            logger.error("Unknown variant in webhook metadata: %s", variant)
            return False

        user_id = UUID(user_id_str)

        if config["type"] == "subscription":
            # Map annual variants to base plan name (user.plan only allows
            # 'free' | 'starter' | 'business')
            base_plan = config["plan"]
            if base_plan.endswith("_annual"):
                base_plan = base_plan.replace("_annual", "")

            expires_at = datetime.now(timezone.utc) + timedelta(
                days=config["period_days"]
            )

            await session.execute(
                sa.update(User)
                .where(User.id == user_id)
                .values(
                    plan=base_plan,
                    credits_remaining=config["credits"],
                    subscription_expires_at=expires_at,
                    subscription_yookassa_id=yookassa_payment_id,
                )
            )
            logger.info(
                "Subscription activated: user=%s plan=%s credits=%d expires=%s",
                user_id,
                base_plan,
                config["credits"],
                expires_at.isoformat(),
            )

        elif config["type"] == "one_time":
            # Atomic credit addition -- do NOT change plan (D-05)
            await session.execute(
                sa.update(User)
                .where(User.id == user_id)
                .values(
                    credits_remaining=User.credits_remaining + config["credits"]
                )
            )
            logger.info(
                "One-time credit added: user=%s +%d credits",
                user_id,
                config["credits"],
            )

        await session.commit()

    return True
