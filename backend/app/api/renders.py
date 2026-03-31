"""Renders router: create, status, list, download, and delete endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from redis import Redis
from rq import Queue
from sqlalchemy import func, select

from app.api.deps import get_current_user
from app.config import settings
from app.database import AsyncSessionLocal
from app.models.image import Image
from app.models.render import Render
from app.models.user import User
from app.schemas.render import (
    CreateRenderRequest,
    RenderListResponse,
    RenderResponse,
    RenderStatusResponse,
)
from app.services import minio as minio_svc

router = APIRouter(prefix="/api/renders", tags=["renders"])

# Marketplace dimensions (must match frontend MARKETPLACE_SIZES)
MARKETPLACE_SIZES = {
    "wb": (900, 1200),
    "ozon": (1200, 1200),
    "ym": (800, 800),
}


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


async def _get_render_or_404(
    render_id: uuid.UUID, user: User
) -> tuple[Render, "AsyncSessionLocal"]:
    """Fetch render with ownership check. Returns (render, session).

    Caller is responsible for closing the session.
    """
    session = AsyncSessionLocal()
    result = await session.execute(
        select(Render).where(Render.id == render_id, Render.user_id == user.id)
    )
    render = result.scalar_one_or_none()
    if render is None:
        await session.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Карточка не найдена",
        )
    return render, session


# ---------------------------------------------------------------------------
# Endpoint 0: POST /api/renders -- create render and enqueue worker job
# ---------------------------------------------------------------------------


@router.post("", response_model=RenderResponse, status_code=status.HTTP_201_CREATED)
async def create_render(
    body: CreateRenderRequest,
    user: User = Depends(get_current_user),
) -> RenderResponse:
    """Create a new render record and enqueue the render_card_job to RQ.

    Validates marketplace, checks credits, creates DB record, enqueues job.
    Returns 201 with render record (status=pending). Client polls GET /status.
    """
    # Validate marketplace
    if body.marketplace not in MARKETPLACE_SIZES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Неизвестный маркетплейс: {body.marketplace}",
        )

    # Check credits
    if user.credits_remaining <= 0 and user.plan != "business":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступных карточек. Оформите подписку",
        )

    # Verify the image exists and belongs to user
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

    # Get marketplace dimensions
    width, height = MARKETPLACE_SIZES[body.marketplace]

    # Create render record
    render_id = uuid.uuid4()
    render = Render(
        id=render_id,
        user_id=user.id,
        image_id=body.image_id,
        template_id=body.template_id,
        overlay_data=body.overlay_data,
        marketplace=body.marketplace,
        output_width=width,
        output_height=height,
        status="pending",
    )

    async with AsyncSessionLocal() as session:
        session.add(render)

        # Decrement credits (except business plan with unlimited)
        if user.plan != "business":
            from sqlalchemy import update
            from app.models.user import User as UserModel

            await session.execute(
                update(UserModel)
                .where(UserModel.id == user.id)
                .values(credits_remaining=UserModel.credits_remaining - 1)
            )

        await session.commit()
        await session.refresh(render)

    # Enqueue RQ job (same pattern as remove_background_job)
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue(connection=redis_conn)
    queue.enqueue(
        "worker.tasks.render_card_job",
        str(render_id),
        job_timeout=300,
    )

    return RenderResponse(
        id=render.id,
        image_id=render.image_id,
        template_id=render.template_id,
        marketplace=render.marketplace,
        output_url=None,
        output_width=render.output_width,
        output_height=render.output_height,
        status=render.status,
        created_at=render.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoint 1: GET /api/renders/{render_id}/status -- polling endpoint
# ---------------------------------------------------------------------------


@router.get("/{render_id}/status", response_model=RenderStatusResponse)
async def get_render_status(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> RenderStatusResponse:
    """Lightweight polling endpoint for render progress."""
    render, session = await _get_render_or_404(render_id, user)
    await session.close()

    # Generate presigned URL if render is complete
    presigned_url: str | None = None
    if render.output_url:
        try:
            presigned_url = minio_svc.get_presigned_get_url(
                minio_svc.BUCKET_RENDERED, render.output_url
            )
        except Exception:
            presigned_url = None

    return RenderStatusResponse(
        status=render.status,
        output_url=presigned_url,
        error_message=render.error_message,
    )


# ---------------------------------------------------------------------------
# Endpoint 2: GET /api/renders -- paginated list (D-02, DASH-02, DASH-04)
# ---------------------------------------------------------------------------


@router.get("", response_model=RenderListResponse)
async def list_renders(
    user: User = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> RenderListResponse:
    """Return paginated list of user's renders with presigned download URLs."""
    async with AsyncSessionLocal() as session:
        # Total count
        count_result = await session.execute(
            select(func.count()).select_from(Render).where(
                Render.user_id == user.id
            )
        )
        total = count_result.scalar() or 0

        # Paginated records, newest first
        rows_result = await session.execute(
            select(Render)
            .where(Render.user_id == user.id)
            .order_by(Render.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        renders = list(rows_result.scalars().all())

    # Build response with presigned URLs
    render_items: list[RenderResponse] = []
    for r in renders:
        presigned_url: str | None = None
        if r.output_url:
            try:
                presigned_url = minio_svc.get_presigned_get_url(
                    minio_svc.BUCKET_RENDERED, r.output_url
                )
            except Exception:
                presigned_url = None

        render_items.append(
            RenderResponse(
                id=r.id,
                image_id=r.image_id,
                template_id=r.template_id,
                marketplace=r.marketplace,
                output_url=presigned_url,
                output_width=r.output_width,
                output_height=r.output_height,
                status=r.status,
                created_at=r.created_at,
            )
        )

    return RenderListResponse(
        renders=render_items,
        total=total,
        limit=limit,
        offset=offset,
    )


# ---------------------------------------------------------------------------
# Endpoint 3: GET /api/renders/{render_id}/download (DASH-03)
# ---------------------------------------------------------------------------


@router.get("/{render_id}/download")
async def download_render(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> dict:
    """Return a time-limited presigned URL for downloading the rendered file."""
    render, session = await _get_render_or_404(render_id, user)
    await session.close()

    if render.output_url is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Карточка ещё не готова",
        )

    presigned_url = minio_svc.get_presigned_get_url(
        minio_svc.BUCKET_RENDERED, render.output_url
    )

    return {
        "download_url": presigned_url,
        "filename": f"{render.marketplace}_{render_id}.png",
    }


# ---------------------------------------------------------------------------
# Endpoint 4: DELETE /api/renders/{render_id} (D-03, DASH-03)
# ---------------------------------------------------------------------------


@router.delete("/{render_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_render(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> Response:
    """Delete render record and its MinIO file. Returns 204 No Content."""
    render, session = await _get_render_or_404(render_id, user)

    try:
        # Delete from MinIO (file might already be gone)
        if render.output_url:
            try:
                minio_svc.delete_object(
                    minio_svc.BUCKET_RENDERED, render.output_url
                )
            except Exception:
                pass  # File already deleted or bucket issue -- not critical

        # Delete DB record
        await session.delete(render)
        await session.commit()
    finally:
        await session.close()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
