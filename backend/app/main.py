from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.health import router as health_router
from app.api.images import router as images_router
from app.api.payments import router as payments_router
from app.api.renders import router as renders_router
from app.api.templates import router as templates_router
from app.api.ai_images import router as ai_images_router
from app.api.ai_photoshoot import router as ai_photoshoot_router


def create_app() -> FastAPI:
    app = FastAPI(
        title="MarketFoto API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(dashboard_router)
    app.include_router(images_router)
    app.include_router(payments_router)
    app.include_router(renders_router)
    app.include_router(templates_router)
    app.include_router(ai_images_router)
    app.include_router(ai_photoshoot_router)

    return app


app = create_app()
