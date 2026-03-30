"""Pydantic request/response models for all image endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class ImageResponse(BaseModel):
    """Full image record returned from most endpoints."""

    id: UUID
    original_url: str
    processed_url: Optional[str] = None
    status: str
    original_width: int
    original_height: int
    original_filename: str
    original_size: int
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UploadInitResponse(BaseModel):
    """Response from POST /api/images/upload with presigned URL for client-side upload."""

    image_id: UUID
    upload_url: str  # presigned PUT URL to MinIO
    object_name: str  # full path in MinIO bucket


class UploadConfirmResponse(BaseModel):
    """Response from POST /api/images/{image_id}/confirm after client uploaded to MinIO."""

    image: ImageResponse


class ImageStatusResponse(BaseModel):
    """Lightweight polling response for background removal progress."""

    status: str
    processed_url: Optional[str] = None
    error_message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
