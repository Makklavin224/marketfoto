"""AI Photoshoot API — generate professional product photography with Gemini."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from redis import Redis
from rq import Queue
from sqlalchemy import select, update

from app.api.deps import get_current_user
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.ai_photoshoot import AIPhotoshoot
from app.models.image import Image
from app.models.user import User
from app.schemas.ai_photoshoot import (
    CreatePhotoshootRequest,
    PhotoshootResponse,
    PhotoshootStatusResponse,
    StylesListResponse,
)
from app.services.ai_photoshoot import MARKETPLACE_DIMENSIONS, get_styles_list
from app.services import minio as minio_svc

router = APIRouter(prefix="/api/ai-photoshoot", tags=["ai-photoshoot"])

# Valid styles for request validation
VALID_STYLES = {"studio", "lifestyle", "minimal", "creative", "infographic"}
VALID_MARKETPLACES = {"wb", "ozon", "ym"}


# ---------------------------------------------------------------------------
# GET /api/ai-photoshoot/styles — list available style presets
# ---------------------------------------------------------------------------


@router.get("/styles", response_model=StylesListResponse)
async def list_styles() -> StylesListResponse:
    """Return available AI photoshoot style presets (public, no auth needed)."""
    return StylesListResponse(styles=get_styles_list())


# ---------------------------------------------------------------------------
# POST /api/ai-photoshoot/generate — create photoshoot and enqueue job
# ---------------------------------------------------------------------------


@router.post(
    "/generate",
    response_model=PhotoshootResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_photoshoot(
    body: CreatePhotoshootRequest,
    user: User = Depends(get_current_user),
) -> PhotoshootResponse:
    """Create a new AI photoshoot render and enqueue the generation job.

    Validates inputs, checks credits, creates DB record, enqueues RQ job.
    Returns 201 with record (status=pending). Client polls GET /status.
    """
    # Validate style
    if body.style not in VALID_STYLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неизвестный стиль: {body.style}",
        )

    # Validate marketplace
    if body.marketplace not in VALID_MARKETPLACES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неизвестный маркетплейс: {body.marketplace}",
        )

    # Check Gemini API key
    if not settings.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI-генерация временно недоступна",
        )

    # Check credits (atomic deduction below)
    if user.credits_remaining <= 0 and user.plan != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступных карточек. Оформите подписку",
        )

    # Verify image exists, belongs to user, and is processed
    async with AsyncSessionLocal() as session:
        img_result = await session.execute(
            select(Image).where(
                Image.id == body.image_id, Image.user_id == user.id
            )
        )
        image = img_result.scalar_one_or_none()
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Изображение не найдено",
            )
        if image.status != "processed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Изображение ещё не обработано. Дождитесь удаления фона.",
            )
        if not image.processed_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="У изображения нет обработанной версии",
            )

    # Get marketplace dimensions
    width, height, _ = MARKETPLACE_DIMENSIONS[body.marketplace]

    # Create photoshoot record + atomic credit deduction
    photoshoot_id = uuid.uuid4()
    photoshoot = AIPhotoshoot(
        id=photoshoot_id,
        user_id=user.id,
        image_id=body.image_id,
        style=body.style,
        marketplace=body.marketplace,
        output_width=width,
        output_height=height,
        status="pending",
    )

    async with AsyncSessionLocal() as session:
        session.add(photoshoot)

        # Atomic credit deduction (except business plan with unlimited)
        if user.plan != "business":
            await session.execute(
                update(User)
                .where(User.id == user.id, User.credits_remaining > 0)
                .values(credits_remaining=User.credits_remaining - 1)
            )

        await session.commit()
        await session.refresh(photoshoot)

    # Enqueue RQ job
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue(connection=redis_conn)
    queue.enqueue(
        "worker.tasks.ai_photoshoot_job",
        str(photoshoot_id),
        str(body.image_id),
        str(user.id),
        body.style,
        body.marketplace,
        job_timeout=120,  # Gemini can take 10-30s, give generous timeout
    )

    return PhotoshootResponse(
        id=photoshoot.id,
        image_id=photoshoot.image_id,
        style=photoshoot.style,
        marketplace=photoshoot.marketplace,
        output_url=None,
        output_width=photoshoot.output_width,
        output_height=photoshoot.output_height,
        status=photoshoot.status,
        processing_time_ms=None,
        created_at=photoshoot.created_at,
    )


# ---------------------------------------------------------------------------
# GET /api/ai-photoshoot/{render_id}/status — polling endpoint
# ---------------------------------------------------------------------------


@router.get("/{render_id}/status", response_model=PhotoshootStatusResponse)
async def get_photoshoot_status(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> PhotoshootStatusResponse:
    """Lightweight polling endpoint for AI photoshoot generation progress."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AIPhotoshoot).where(
                AIPhotoshoot.id == render_id,
                AIPhotoshoot.user_id == user.id,
            )
        )
        photoshoot = result.scalar_one_or_none()

    if photoshoot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Генерация не найдена",
        )

    # Generate presigned URL if complete
    presigned_url: str | None = None
    if photoshoot.output_url:
        try:
            presigned_url = minio_svc.get_presigned_get_url(
                minio_svc.BUCKET_RENDERED, photoshoot.output_url
            )
        except Exception:
            presigned_url = None

    return PhotoshootStatusResponse(
        status=photoshoot.status,
        output_url=presigned_url,
        error_message=photoshoot.error_message,
        processing_time_ms=photoshoot.processing_time_ms,
    )


# ---------------------------------------------------------------------------
# GET /api/ai-photoshoot/{render_id}/download — presigned download URL
# ---------------------------------------------------------------------------


@router.get("/{render_id}/download")
async def download_photoshoot(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> dict:
    """Return a time-limited presigned URL for downloading the result."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(AIPhotoshoot).where(
                AIPhotoshoot.id == render_id,
                AIPhotoshoot.user_id == user.id,
            )
        )
        photoshoot = result.scalar_one_or_none()

    if photoshoot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Генерация не найдена",
        )

    if photoshoot.output_url is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Изображение ещё не готово",
        )

    presigned_url = minio_svc.get_presigned_get_url(
        minio_svc.BUCKET_RENDERED, photoshoot.output_url
    )

    return {
        "download_url": presigned_url,
        "filename": f"ai_{photoshoot.style}_{photoshoot.marketplace}_{render_id}.png",
    }
