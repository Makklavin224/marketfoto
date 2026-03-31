"""Pydantic models for renders: create request, response, status, list."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel


class CreateRenderRequest(BaseModel):
    """Request body for POST /api/renders."""

    image_id: UUID
    template_id: UUID
    overlay_data: Dict[str, Any]
    marketplace: str  # 'wb', 'ozon', 'ym'


class RenderResponse(BaseModel):
    """Single render record returned from list/detail endpoints."""

    id: UUID
    image_id: UUID
    template_id: UUID
    marketplace: str  # 'wb', 'ozon', 'ym'
    output_url: Optional[str] = None  # presigned download URL (generated on read)
    output_width: int
    output_height: int
    status: str  # 'pending', 'rendering', 'complete', 'failed'
    created_at: datetime

    model_config = {"from_attributes": True}


class RenderStatusResponse(BaseModel):
    """Lightweight polling response for render progress."""

    status: str  # 'pending', 'rendering', 'complete', 'failed'
    output_url: Optional[str] = None
    error_message: Optional[str] = None


class RenderListResponse(BaseModel):
    """Paginated list of renders with total count."""

    renders: list[RenderResponse]
    total: int  # total count for pagination info
    limit: int
    offset: int
