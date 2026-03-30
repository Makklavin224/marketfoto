from __future__ import annotations

import logging

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.api.deps import get_current_user
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    CancelSubscriptionResponse,
    CreatePaymentRequest,
    CreatePaymentResponse,
    PaymentHistoryResponse,
    PaymentResponse,
)
from app.services.payment import (
    check_ip_whitelist,
    create_yookassa_payment,
    process_webhook,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/payments", tags=["payments"])


@router.post("/create", response_model=CreatePaymentResponse)
async def create_payment(
    body: CreatePaymentRequest,
    current_user: User = Depends(get_current_user),
) -> CreatePaymentResponse:
    """
    Create a YooKassa payment and return a redirect URL for checkout.
    """
    try:
        payment, confirmation_url = await create_yookassa_payment(
            user_id=current_user.id,
            variant=body.variant,
            return_url=f"{settings.app_url}/payment/success",
        )
    except Exception:
        logger.exception("Failed to create YooKassa payment")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment service unavailable",
        )

    return CreatePaymentResponse(
        payment_id=payment.id,
        confirmation_url=confirmation_url,
    )


@router.get("/history", response_model=PaymentHistoryResponse)
async def payment_history(
    current_user: User = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> PaymentHistoryResponse:
    """
    Return the authenticated user's payment history, ordered by created_at desc.
    """
    async with AsyncSessionLocal() as session:
        # Get paginated payments
        result = await session.execute(
            sa.select(Payment)
            .where(Payment.user_id == current_user.id)
            .order_by(Payment.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        payments = result.scalars().all()

        # Get total count
        count_result = await session.execute(
            sa.select(sa.func.count())
            .select_from(Payment)
            .where(Payment.user_id == current_user.id)
        )
        total = count_result.scalar() or 0

    return PaymentHistoryResponse(
        payments=[PaymentResponse.model_validate(p) for p in payments],
        total=total,
    )


@router.post("/cancel-subscription", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
) -> CancelSubscriptionResponse:
    """
    Cancel subscription auto-renewal. Plan remains active until subscription_expires_at.

    TODO: In production, also call YooKassa API to cancel the recurring payment.
    For MVP, clearing subscription_yookassa_id is sufficient since we haven't
    implemented autopay yet (requires YooKassa manager approval per PITFALLS.md
    Pitfall 9).
    """
    if current_user.plan == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription",
        )

    if current_user.subscription_expires_at is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription",
        )

    async with AsyncSessionLocal() as session:
        await session.execute(
            sa.update(User)
            .where(User.id == current_user.id)
            .values(subscription_yookassa_id=None)
        )
        await session.commit()

    logger.info(
        "Subscription cancelled for user %s (plan=%s, active until %s)",
        current_user.id,
        current_user.plan,
        current_user.subscription_expires_at,
    )

    return CancelSubscriptionResponse(
        message=f"Подписка отменена. Ваш план активен до {current_user.subscription_expires_at.strftime('%d.%m.%Y')}",
        plan_active_until=current_user.subscription_expires_at,
    )


@router.post("/webhook")
async def webhook(request: Request) -> dict:
    """
    YooKassa webhook endpoint. No authentication -- YooKassa sends without JWT.
    Validates source IP against YooKassa's known IP ranges.
    Returns 200 immediately to prevent retries (Pitfall 9).
    """
    # Resolve client IP (support X-Forwarded-For behind nginx)
    forwarded_for = request.headers.get("x-forwarded-for", "")
    client_ip = forwarded_for.split(",")[0].strip() if forwarded_for else ""
    if not client_ip and request.client:
        client_ip = request.client.host

    if not check_ip_whitelist(client_ip):
        logger.warning("Webhook rejected: IP %s not in YooKassa whitelist", client_ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden",
        )

    try:
        payload = await request.json()
    except Exception:
        logger.exception("Failed to parse webhook JSON body")
        return {"status": "ok"}

    try:
        await process_webhook(payload)
    except Exception:
        # Log the error and full payload for manual reconciliation, but still
        # return 200 to prevent YooKassa from retrying (Pitfall 9).
        logger.exception("Error processing webhook payload: %s", payload)

    return {"status": "ok"}
