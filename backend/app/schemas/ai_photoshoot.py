"""Pydantic schemas for AI Photoshoot endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class StylePreset(BaseModel):
    """Single style preset returned by GET /styles."""

    id: str
    name: str
    description: str


class StylesListResponse(BaseModel):
    """List of available style presets."""

    styles: list[StylePreset]


class CreatePhotoshootRequest(BaseModel):
    """Request body for POST /api/ai-photoshoot/generate."""

    image_id: UUID
    style: str  # 'studio', 'lifestyle', 'minimal', 'creative', 'infographic'
    marketplace: str  # 'wb', 'ozon', 'ym'
    # Optional product info for enhanced prompts and text overlays
    title: Optional[str] = None
    features: Optional[list[str]] = None
    badge: Optional[str] = None


class PhotoshootResponse(BaseModel):
    """AI Photoshoot record returned after creation."""

    id: UUID
    image_id: UUID
    style: str
    marketplace: str
    output_url: Optional[str] = None
    output_width: int
    output_height: int
    status: str  # 'pending', 'generating', 'complete', 'failed'
    processing_time_ms: Optional[int] = None
    product_info: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PhotoshootStatusResponse(BaseModel):
    """Lightweight polling response for generation progress."""

    status: str  # 'pending', 'generating', 'complete', 'failed'
    output_url: Optional[str] = None
    error_message: Optional[str] = None
    processing_time_ms: Optional[int] = None


class SuggestRequest(BaseModel):
    """Request body for POST /api/ai-photoshoot/suggest."""

    image_id: UUID


class SuggestResponse(BaseModel):
    """AI-suggested product title and features."""

    title: str
    features: list[str]
