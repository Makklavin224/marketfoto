from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_current_user
from app.config import settings
from app.models.user import User
from app.schemas.payment import CreatePaymentRequest, CreatePaymentResponse
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
