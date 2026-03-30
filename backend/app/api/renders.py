"""Renders router: list, download, and delete endpoints for user renders."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, select

from app.api.deps import get_current_user
from app.database import AsyncSessionLocal
from app.models.render import Render
from app.models.user import User
from app.schemas.render import RenderListResponse, RenderResponse
from app.services import minio as minio_svc

router = APIRouter(prefix="/api/renders", tags=["renders"])


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
# Endpoint 1: GET /api/renders -- paginated list (D-02, DASH-02, DASH-04)
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
# Endpoint 2: GET /api/renders/{render_id}/download (DASH-03)
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
# Endpoint 3: DELETE /api/renders/{render_id} (D-03, DASH-03)
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
