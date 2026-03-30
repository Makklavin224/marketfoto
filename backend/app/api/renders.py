"""Renders router with 4 endpoints: create, list, status, delete.

Handles atomic credit deduction, RQ job enqueue, presigned URL generation,
and render history with pagination.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from redis import Redis
from rq import Queue
from sqlalchemy import func, select, text

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.image import Image
from app.models.render import Render
from app.models.template import Template
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.render import (
    RenderCreateRequest,
    RenderListResponse,
    RenderResponse,
    RenderStatusResponse,
)
from app.services import minio as minio_svc

router = APIRouter(prefix="/api/renders", tags=["renders"])

# Marketplace output dimensions (per D-03, RNDR-03)
MARKETPLACE_SIZES: dict[str, tuple[int, int]] = {
    "wb": (900, 1200),
    "ozon": (1200, 1200),
    "ym": (800, 800),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_render_or_404(
    render_id: uuid.UUID, user: User
) -> tuple[Render, AsyncSessionLocal]:
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
            detail="Рендер не найден",
        )
    return render, session


def _render_status(render: Render) -> str:
    """Derive status from output_url presence."""
    if render.output_url:
        return "complete"
    return "pending"


def _render_to_response(render: Render) -> RenderResponse:
    """Convert Render model to RenderResponse with presigned URL."""
    output_url = None
    if render.output_url:
        output_url = minio_svc.get_presigned_get_url(
            minio_svc.BUCKET_RENDERED, render.output_url
        )
    return RenderResponse(
        id=render.id,
        image_id=render.image_id,
        template_id=render.template_id,
        marketplace=render.marketplace,
        output_url=output_url,
        output_width=render.output_width,
        output_height=render.output_height,
        status=_render_status(render),
        created_at=render.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoint 1: POST /api/renders (per D-01, D-05, RNDR-01, RNDR-05, RNDR-10)
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=RenderResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_render(
    body: RenderCreateRequest,
    user: User = Depends(get_current_user),
) -> RenderResponse:
    """Create a render: validate inputs, atomically deduct 1 credit, enqueue RQ job.

    Returns 202 immediately. Client polls GET /status for progress.
    """
    async with AsyncSessionLocal() as session:
        # Step 1: Validate image exists, belongs to user, and is processed
        result = await session.execute(
            select(Image).where(
                Image.id == body.image_id, Image.user_id == user.id
            )
        )
        image = result.scalar_one_or_none()
        if image is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Изображение не найдено",
            )
        if image.status != "processed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Фон ещё не удалён. Сначала обработайте изображение",
            )

        # Step 2: Validate template exists
        result = await session.execute(
            select(Template).where(Template.id == body.template_id)
        )
        template = result.scalar_one_or_none()
        if template is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не найден",
            )

        # Step 3: ATOMIC credit deduction (per D-05, RNDR-05, RNDR-10)
        # CRITICAL: Single atomic UPDATE that checks AND deducts in one statement.
        # This prevents double-spend on concurrent clicks.
        result = await session.execute(
            text(
                "UPDATE users SET credits_remaining = credits_remaining - 1 "
                "WHERE id = :user_id AND credits_remaining > 0 "
                "RETURNING credits_remaining"
            ),
            {"user_id": str(user.id)},
        )
        row = result.fetchone()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Недостаточно карточек. Оформите подписку",
            )

        # Step 4: Resolve output dimensions from marketplace
        output_w, output_h = MARKETPLACE_SIZES[body.marketplace]

        # Step 5: Create Render record
        render = Render(
            user_id=user.id,
            image_id=body.image_id,
            template_id=body.template_id,
            overlay_data=body.overlay_data.model_dump(),
            marketplace=body.marketplace,
            output_url=None,
            output_width=output_w,
            output_height=output_h,
        )
        session.add(render)
        await session.commit()
        await session.refresh(render)

    # Step 6: Enqueue RQ job (outside DB session)
    redis_conn = Redis.from_url(settings.redis_url)
    queue = Queue(connection=redis_conn)
    queue.enqueue(
        "worker.tasks.render_card_job",
        str(render.id),
        job_timeout=60,
    )

    return _render_to_response(render)


# ---------------------------------------------------------------------------
# Endpoint 2: GET /api/renders (per D-07, RNDR-08)
# ---------------------------------------------------------------------------


@router.get("", response_model=RenderListResponse)
async def list_renders(
    user: User = Depends(get_current_user),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    sort: str = Query(default="created_at:desc"),
) -> RenderListResponse:
    """List render history for the authenticated user with pagination."""
    # Parse sort parameter
    if sort == "created_at:asc":
        order = Render.created_at.asc()
    else:
        order = Render.created_at.desc()

    async with AsyncSessionLocal() as session:
        # Get total count
        count_result = await session.execute(
            select(func.count(Render.id)).where(Render.user_id == user.id)
        )
        total = count_result.scalar_one()

        # Get paginated results
        result = await session.execute(
            select(Render)
            .where(Render.user_id == user.id)
            .order_by(order)
            .limit(limit)
            .offset(offset)
        )
        renders = result.scalars().all()

    return RenderListResponse(
        renders=[_render_to_response(r) for r in renders],
        total=total,
        limit=limit,
        offset=offset,
    )


# ---------------------------------------------------------------------------
# Endpoint 3: GET /api/renders/{id}/status (polling)
# ---------------------------------------------------------------------------


@router.get("/{render_id}/status", response_model=RenderStatusResponse)
async def get_render_status(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> RenderStatusResponse:
    """Lightweight polling endpoint for render progress."""
    render, session = await _get_render_or_404(render_id, user)
    await session.close()

    output_url = None
    if render.output_url:
        output_url = minio_svc.get_presigned_get_url(
            minio_svc.BUCKET_RENDERED, render.output_url
        )

    return RenderStatusResponse(
        status=_render_status(render),
        output_url=output_url,
        error_message=None,
    )


# ---------------------------------------------------------------------------
# Endpoint 4: DELETE /api/renders/{id} (per D-08, RNDR-09)
# ---------------------------------------------------------------------------


@router.delete("/{render_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_render(
    render_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> Response:
    """Delete render record and associated file from MinIO."""
    render, session = await _get_render_or_404(render_id, user)

    try:
        # Delete from MinIO if output exists
        if render.output_url:
            minio_svc.delete_object(minio_svc.BUCKET_RENDERED, render.output_url)

        # Delete DB record
        await session.delete(render)
        await session.commit()
    finally:
        await session.close()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
