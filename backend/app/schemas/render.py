"""Pydantic response models for renders list, detail, and download endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class RenderResponse(BaseModel):
    """Single render record returned from list/detail endpoints."""

    id: UUID
    image_id: UUID
    template_id: UUID
    marketplace: str  # 'wb', 'ozon', 'ym'
    output_url: Optional[str] = None  # presigned download URL (generated on read)
    output_width: int
    output_height: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RenderListResponse(BaseModel):
    """Paginated list of renders with total count."""

    renders: list[RenderResponse]
    total: int  # total count for pagination info
    limit: int
    offset: int
