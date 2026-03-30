from __future__ import annotations

from typing import Any

import redis.asyncio as aioredis
from fastapi import APIRouter
from minio import Minio
from sqlalchemy import text

from app.config import settings
from app.database import engine

router = APIRouter()


@router.get("/api/health")
async def health_check() -> dict[str, Any]:
    checks: dict[str, Any] = {}
    all_ok = True

    # PostgreSQL check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = "connected"
    except Exception as exc:
        checks["postgres"] = f"error: {exc}"
        all_ok = False

    # Redis check
    try:
        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = "connected"
    except Exception as exc:
        checks["redis"] = f"error: {exc}"
        all_ok = False

    # MinIO check
    try:
        endpoint = settings.s3_endpoint.replace("http://", "").replace("https://", "")
        client = Minio(
            endpoint,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=False,
        )
        buckets = [b.name for b in client.list_buckets()]
        checks["minio"] = {"status": "connected", "buckets": buckets}
    except Exception as exc:
        checks["minio"] = f"error: {exc}"
        all_ok = False

    return {
        "status": "healthy" if all_ok else "unhealthy",
        "checks": checks,
    }
