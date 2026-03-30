from pydantic import BaseModel
from uuid import UUID


class TemplateListItem(BaseModel):
    """Template summary for list endpoint (no config). Per D-02."""

    id: UUID
    name: str
    slug: str
    category: str
    preview_url: str
    is_premium: bool
    marketplace: list[str]

    model_config = {"from_attributes": True}


class TemplateDetail(BaseModel):
    """Full template with config JSON. Per D-03."""

    id: UUID
    name: str
    slug: str
    category: str
    preview_url: str
    config: dict
    is_premium: bool
    marketplace: list[str]
    sort_order: int

    model_config = {"from_attributes": True}


class TemplateListResponse(BaseModel):
    """Wrapper response for list endpoint."""

    templates: list[TemplateListItem]


class TemplateDetailResponse(BaseModel):
    """Wrapper response for detail endpoint."""

    template: TemplateDetail
