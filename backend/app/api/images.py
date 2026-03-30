"""Images router with upload, confirm, get, delete, status endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import Response
from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.image import Image
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.images import ImageResponse, ImageStatusResponse
from app.services import minio as minio_svc
from app.services import images as image_svc

router = APIRouter(prefix="/api/images", tags=["images"])


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

async def _get_image_or_404(
    image_id: uuid.UUID, user: User
) -> tuple[Image, "AsyncSessionLocal"]:
    """Fetch image with ownership check. Returns (image, session).

    Caller is responsible for closing the session (use as context manager).
    """
    session = AsyncSessionLocal()
    result = await session.execute(
        select(Image).where(Image.id == image_id, Image.user_id == user.id)
    )
    image = result.scalar_one_or_none()
    if image is None:
        await session.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Изображение не найдено",
        )
    return image, session


# ---------------------------------------------------------------------------
# Endpoint 1: POST /api/images/upload
# ---------------------------------------------------------------------------

@router.post(
    "/upload",
    response_model=ImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
) -> ImageResponse:
    """Upload an image: validate, store in MinIO, create DB record.

    Two-step simplified presigned flow (D-01, D-03, D-04, D-05):
    client -> backend (validation) -> MinIO.
    """
    # Read entire file into memory (max 10MB, acceptable)
    file_data = await file.read()

    # Step 1: Validate file size
    if not image_svc.validate_file_size(len(file_data)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Файл слишком большой. Максимум 10 МБ",
        )

    # Step 2: Validate magic bytes (D-02, UPLD-02)
    detected_mime = image_svc.validate_magic_bytes(file_data[:12])
    if detected_mime is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Неподдерживаемый формат. Допустимы JPG, PNG, WebP",
        )

    # Step 3: Validate dimensions
    width, height = image_svc.get_image_dimensions(file_data)
    valid, error_msg = image_svc.validate_dimensions(width, height)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    # Step 4: Check credits (D-05, UPLD-04)
    if user.credits_remaining <= 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступных карточек. Оформите подписку",
        )

    # Step 5: Auto-resize if needed (D-06, UPLD-10)
    final_data, final_width, final_height, _was_resized = (
        image_svc.resize_if_needed(file_data, detected_mime)
    )

    # Step 6: Generate IDs and path
    image_id = uuid.uuid4()
    ext = image_svc.get_extension_from_mime(detected_mime)
    object_name = f"{user.id}/{image_id}.{ext}"

    # Step 7: Upload to MinIO
    minio_svc.upload_bytes(
        minio_svc.BUCKET_ORIGINALS, object_name, final_data, detected_mime
    )

    # Step 8: Generate presigned GET URL for response
    presigned_url = minio_svc.get_presigned_get_url(
        minio_svc.BUCKET_ORIGINALS, object_name
    )

    # Step 9: Create DB record
    # Store object path (not presigned URL) in original_url
    image_record = Image(
        id=image_id,
        user_id=user.id,
        original_url=object_name,
        original_filename=file.filename or "upload",
        original_size=len(final_data),
        original_width=final_width,
        original_height=final_height,
        status="uploaded",
    )

    async with AsyncSessionLocal() as session:
        session.add(image_record)
        await session.commit()
        await session.refresh(image_record)

    # Return response with presigned URL (not storage path)
    return ImageResponse(
        id=image_record.id,
        original_url=presigned_url,
        processed_url=None,
        status=image_record.status,
        original_width=image_record.original_width,
        original_height=image_record.original_height,
        original_filename=image_record.original_filename,
        original_size=image_record.original_size,
        processing_time_ms=None,
        error_message=None,
        created_at=image_record.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoint 2: GET /api/images/{image_id}
# ---------------------------------------------------------------------------

@router.get("/{image_id}", response_model=ImageResponse)
async def get_image(
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> ImageResponse:
    """Get image record with fresh presigned URLs (D-08)."""
    image, session = await _get_image_or_404(image_id, user)
    await session.close()

    # Generate fresh presigned GET URL from stored object path
    original_presigned = minio_svc.get_presigned_get_url(
        minio_svc.BUCKET_ORIGINALS, image.original_url
    )

    processed_presigned = None
    if image.processed_url:
        processed_presigned = minio_svc.get_presigned_get_url(
            minio_svc.BUCKET_PROCESSED, image.processed_url
        )

    return ImageResponse(
        id=image.id,
        original_url=original_presigned,
        processed_url=processed_presigned,
        status=image.status,
        original_width=image.original_width,
        original_height=image.original_height,
        original_filename=image.original_filename,
        original_size=image.original_size,
        processing_time_ms=image.processing_time_ms,
        error_message=image.error_message,
        created_at=image.created_at,
    )


# ---------------------------------------------------------------------------
# Endpoint 3: GET /api/images/{image_id}/status
# ---------------------------------------------------------------------------

@router.get("/{image_id}/status", response_model=ImageStatusResponse)
async def get_image_status(
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> ImageStatusResponse:
    """Lightweight polling endpoint for background removal progress."""
    image, session = await _get_image_or_404(image_id, user)
    await session.close()

    processed_presigned = None
    if image.processed_url:
        processed_presigned = minio_svc.get_presigned_get_url(
            minio_svc.BUCKET_PROCESSED, image.processed_url
        )

    return ImageStatusResponse(
        status=image.status,
        processed_url=processed_presigned,
        error_message=image.error_message,
    )


# ---------------------------------------------------------------------------
# Endpoint 4: DELETE /api/images/{image_id}
# ---------------------------------------------------------------------------

@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> Response:
    """Delete image from MinIO and DB (D-09)."""
    image, session = await _get_image_or_404(image_id, user)

    try:
        # Delete from MinIO: originals
        minio_svc.delete_object(minio_svc.BUCKET_ORIGINALS, image.original_url)

        # Delete processed if exists
        if image.processed_url:
            minio_svc.delete_object(
                minio_svc.BUCKET_PROCESSED, image.processed_url
            )

        # Delete DB record
        await session.delete(image)
        await session.commit()
    finally:
        await session.close()

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Endpoint 5: POST /api/images/{image_id}/remove-background
# ---------------------------------------------------------------------------

@router.post(
    "/{image_id}/remove-background",
    response_model=ImageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def remove_background(
    image_id: uuid.UUID,
    user: User = Depends(get_current_user),
) -> ImageResponse:
    """Initiate background removal (D-07, UPLD-11).

    NOTE: Actual RQ job enqueue will be added in Phase 4.
    For now, this endpoint only sets status to 'processing'.
    """
    image, session = await _get_image_or_404(image_id, user)

    try:
        # Check if already processing or processed
        if image.status == "processing":
            await session.close()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Изображение уже обрабатывается",
            )
        if image.status == "processed":
            await session.close()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Фон уже удалён",
            )

        # Set status to processing (Phase 4 will add RQ enqueue here)
        image.status = "processing"
        await session.commit()
        await session.refresh(image)
    finally:
        await session.close()

    # Generate presigned URL for response
    original_presigned = minio_svc.get_presigned_get_url(
        minio_svc.BUCKET_ORIGINALS, image.original_url
    )

    return ImageResponse(
        id=image.id,
        original_url=original_presigned,
        processed_url=None,
        status=image.status,
        original_width=image.original_width,
        original_height=image.original_height,
        original_filename=image.original_filename,
        original_size=image.original_size,
        processing_time_ms=image.processing_time_ms,
        error_message=image.error_message,
        created_at=image.created_at,
    )
