"""AI Image Generation API — Nano Banana 2 endpoints."""

import base64
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.services.ai_image import (
    generate_image,
    generate_product_card_example,
    generate_template_preview,
    generate_design_asset,
)
from app.config import settings

router = APIRouter(prefix="/api/ai-images", tags=["ai-images"])


class GenerateRequest(BaseModel):
    prompt: str
    aspect_ratio: str = "3:4"
    resolution: str = "1K"


class BeforeAfterRequest(BaseModel):
    product_description: str
    marketplace: str = "wb"


class TemplatePreviewRequest(BaseModel):
    template_name: str
    category: str
    product: str = "стильная термокружка"


class DesignAssetRequest(BaseModel):
    asset_type: str  # background, badge, icon, pattern, hero
    description: str
    aspect_ratio: str = "1:1"


class ImageResponse(BaseModel):
    image_base64: str
    content_type: str = "image/png"


class BeforeAfterResponse(BaseModel):
    before_base64: str
    after_base64: str
    content_type: str = "image/png"


def _check_api_key():
    if not settings.gemini_api_key:
        raise HTTPException(503, "Gemini API key not configured")


@router.post("/generate", response_model=ImageResponse)
async def api_generate_image(req: GenerateRequest, user=Depends(get_current_user)):
    _check_api_key()
    try:
        data = await generate_image(req.prompt, req.aspect_ratio, req.resolution)
        return ImageResponse(image_base64=base64.b64encode(data).decode())
    except Exception as e:
        raise HTTPException(500, f"Image generation failed: {str(e)}")


@router.post("/before-after", response_model=BeforeAfterResponse)
async def api_before_after(req: BeforeAfterRequest, user=Depends(get_current_user)):
    _check_api_key()
    try:
        result = await generate_product_card_example(req.product_description, req.marketplace)
        return BeforeAfterResponse(
            before_base64=base64.b64encode(result["before"]).decode(),
            after_base64=base64.b64encode(result["after"]).decode(),
        )
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")


@router.post("/template-preview", response_model=ImageResponse)
async def api_template_preview(req: TemplatePreviewRequest, user=Depends(get_current_user)):
    _check_api_key()
    try:
        data = await generate_template_preview(req.template_name, req.category, req.product)
        return ImageResponse(image_base64=base64.b64encode(data).decode())
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")


@router.post("/design-asset", response_model=ImageResponse)
async def api_design_asset(req: DesignAssetRequest, user=Depends(get_current_user)):
    _check_api_key()
    try:
        data = await generate_design_asset(req.asset_type, req.description, req.aspect_ratio)
        return ImageResponse(image_base64=base64.b64encode(data).decode())
    except Exception as e:
        raise HTTPException(500, f"Generation failed: {str(e)}")
