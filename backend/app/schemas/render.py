"""Pydantic request/response models for renders API (per D-01, RNDR-01)."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --- Nested overlay_data types (match frontend types/editor.ts OverlayData) ---


class OverlayProduct(BaseModel):
    """Product image position on canvas."""

    x: float
    y: float
    width: float
    height: float
    rotation: float = 0.0


class OverlayText(BaseModel):
    """Single text area override."""

    area_id: str
    content: str
    fontSize: float = Field(ge=8, le=120)
    fontFamily: str = "Inter"
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    fontWeight: str = "normal"


class OverlayBadge(BaseModel):
    """Badge toggle and custom text."""

    enabled: bool = True
    text: str = ""


class OverlayData(BaseModel):
    """Complete overlay_data from canvas editor."""

    product: OverlayProduct
    texts: list[OverlayText] = []
    badge: OverlayBadge = OverlayBadge()


# --- Request ---


class RenderCreateRequest(BaseModel):
    """POST /api/renders request body (per D-01, RNDR-01)."""

    image_id: UUID
    template_id: UUID
    overlay_data: OverlayData
    marketplace: str = Field(pattern=r"^(wb|ozon|ym)$")


# --- Response ---


class RenderResponse(BaseModel):
    """Full render record."""

    id: UUID
    image_id: UUID
    template_id: UUID
    marketplace: str
    output_url: Optional[str] = None
    output_width: int
    output_height: int
    status: str  # "pending" | "rendering" | "complete" | "failed"
    created_at: datetime

    model_config = {"from_attributes": True}


class RenderStatusResponse(BaseModel):
    """Lightweight polling response for render progress."""

    status: str
    output_url: Optional[str] = None
    error_message: Optional[str] = None


class RenderListResponse(BaseModel):
    """Paginated list response (per D-07, RNDR-08)."""

    renders: list[RenderResponse]
    total: int
    limit: int
    offset: int
