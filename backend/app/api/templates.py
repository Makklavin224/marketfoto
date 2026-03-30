from __future__ import annotations

from typing import Optional
from uuid import UUID

import jwt
from fastapi import APIRouter, Header, HTTPException
from sqlalchemy import select

from app.config import settings
from app.database import AsyncSessionLocal
from app.models.template import Template
from app.models.user import User
from app.schemas.template import (
    TemplateDetail,
    TemplateDetailResponse,
    TemplateListItem,
    TemplateListResponse,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])


async def get_optional_current_user(
    authorization: Optional[str] = None,
) -> Optional[User]:
    """Decode JWT and return User if valid, else None. Never raises."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.removeprefix("Bearer ")
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, Exception):
        return None

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.id == UUID(user_id))
            )
            return result.scalar_one_or_none()
    except Exception:
        return None


@router.get("", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = None,
    marketplace: Optional[str] = None,
) -> TemplateListResponse:
    """List templates with optional category and marketplace filtering."""
    async with AsyncSessionLocal() as session:
        query = select(Template)

        if category:
            query = query.where(Template.category == category)
        if marketplace:
            query = query.where(Template.marketplace.any(marketplace))

        query = query.order_by(Template.sort_order.asc(), Template.name.asc())

        result = await session.execute(query)
        templates = result.scalars().all()

        items = [TemplateListItem.model_validate(t) for t in templates]
        return TemplateListResponse(templates=items)


@router.get("/{template_id}", response_model=TemplateDetailResponse)
async def get_template(
    template_id: UUID,
    authorization: Optional[str] = Header(default=None),
) -> TemplateDetailResponse:
    """Get full template detail. Premium templates require a paid plan."""
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Template).where(Template.id == template_id)
        )
        template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template.is_premium:
        user = await get_optional_current_user(authorization)
        if user is None or user.plan == "free":
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "Этот шаблон доступен по подписке. Оформите подписку для доступа.",
                    "upgrade_url": "/pricing",
                },
            )

    detail = TemplateDetail.model_validate(template)
    return TemplateDetailResponse(template=detail)
