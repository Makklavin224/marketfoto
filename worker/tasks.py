"""RQ worker job for background removal using rembg.

This module runs in a SYNCHRONOUS forked subprocess managed by RQ.
Do NOT use async/await anywhere in this file.

CRITICAL (PITFALLS.md Pitfall 1, UPLD-12):
- rembg session is created ONCE at module level and reused across all jobs.
- Docker --max-jobs 100 (in docker-compose.yml) handles process recycling.
- Docker memory limit is 2GB (in docker-compose.yml).
"""

from __future__ import annotations

import io
import logging
import os
import time

from PIL import Image
from minio import Minio
from rembg import new_session, remove
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level rembg session: loaded once, reused across all jobs in this fork.
# The model is pre-downloaded and pre-warmed in the worker Dockerfile.
# ---------------------------------------------------------------------------
rembg_session = new_session("birefnet-general")

# ---------------------------------------------------------------------------
# Configuration from environment (shared .env with backend)
# ---------------------------------------------------------------------------
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://marketfoto:password@postgres:5432/marketfoto"
)
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379")
S3_ENDPOINT = os.environ.get("S3_ENDPOINT", "minio:9000")
S3_ACCESS_KEY = os.environ.get("S3_ACCESS_KEY", "marketfoto")
S3_SECRET_KEY = os.environ.get("S3_SECRET_KEY", "changeme")

# ---------------------------------------------------------------------------
# Synchronous SQLAlchemy engine (NOT async -- RQ workers run sync code)
# ---------------------------------------------------------------------------
_sync_engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=2)

# ---------------------------------------------------------------------------
# MinIO client (synchronous)
# ---------------------------------------------------------------------------
_minio_client = Minio(
    S3_ENDPOINT.replace("http://", "").replace("https://", ""),
    access_key=S3_ACCESS_KEY,
    secret_key=S3_SECRET_KEY,
    secure=S3_ENDPOINT.startswith("https://"),
)


def _update_image_status(
    image_id: str,
    *,
    status: str,
    processed_url: str | None = None,
    processing_time_ms: int | None = None,
    error_message: str | None = None,
) -> None:
    """Update image record in PostgreSQL using raw SQL (sync)."""
    with _sync_engine.connect() as conn:
        conn.execute(
            text(
                "UPDATE images SET status = :status, "
                "processed_url = :processed_url, "
                "processing_time_ms = :processing_time_ms, "
                "error_message = :error_message "
                "WHERE id = :image_id::uuid"
            ),
            {
                "status": status,
                "processed_url": processed_url,
                "processing_time_ms": processing_time_ms,
                "error_message": error_message,
                "image_id": image_id,
            },
        )
        conn.commit()


def _get_image_original_url(image_id: str) -> str | None:
    """Fetch original_url from DB for the given image."""
    with _sync_engine.connect() as conn:
        result = conn.execute(
            text("SELECT original_url FROM images WHERE id = :image_id::uuid"),
            {"image_id": image_id},
        )
        row = result.fetchone()
        return row[0] if row else None


def remove_background_job(image_id: str, user_id: str) -> None:
    """Remove background from an image using rembg.

    Called by RQ with job_timeout=30 (set at enqueue time).
    If the job exceeds 30s, RQ raises JobTimeoutException and kills the fork.

    Args:
        image_id: UUID string of the image record.
        user_id: UUID string of the owning user.
    """
    start_time = time.time()

    try:
        # Step 1: Mark as processing
        _update_image_status(image_id, status="processing")
        logger.info("Processing image %s for user %s", image_id, user_id)

        # Step 2: Get original_url from DB to know the object key
        original_url = _get_image_original_url(image_id)
        if not original_url:
            raise ValueError(f"Image record not found: {image_id}")

        # Step 3: Download original from MinIO
        try:
            response = _minio_client.get_object("originals", original_url)
            original_bytes = response.read()
            response.close()
            response.release_conn()
        except Exception as exc:
            raise RuntimeError(f"Failed to download original image: {exc}") from exc

        # Step 4: Open with Pillow, remove background with rembg session reuse
        try:
            input_image = Image.open(io.BytesIO(original_bytes)).convert("RGBA")
            result_image = remove(input_image, session=rembg_session)
        except Exception as exc:
            raise RuntimeError(f"Background removal failed: {exc}") from exc

        # Step 5: Save result as PNG to BytesIO
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format="PNG")
        output_buffer.seek(0)
        png_bytes = output_buffer.getvalue()

        # Step 6: Upload to MinIO processed bucket
        processed_key = f"{user_id}/{image_id}.png"
        try:
            _minio_client.put_object(
                "processed",
                processed_key,
                io.BytesIO(png_bytes),
                len(png_bytes),
                content_type="image/png",
            )
        except Exception as exc:
            raise RuntimeError(f"Failed to save processed image: {exc}") from exc

        # Step 7: Calculate processing time and update DB
        processing_time_ms = int((time.time() - start_time) * 1000)

        _update_image_status(
            image_id,
            status="processed",
            processed_url=processed_key,
            processing_time_ms=processing_time_ms,
        )

        logger.info(
            "Image %s processed in %dms", image_id, processing_time_ms
        )

    except Exception as exc:
        # Catch-all: mark as failed with error message (UPLD-09)
        elapsed_ms = int((time.time() - start_time) * 1000)
        error_msg = str(exc)[:500]

        # Check for timeout specifically
        exc_type = type(exc).__name__
        if "TimeoutException" in exc_type or "JobTimeoutException" in exc_type:
            error_msg = "Timeout: processing exceeded 30 seconds"

        logger.error("Image %s failed: %s", image_id, error_msg)

        try:
            _update_image_status(
                image_id,
                status="failed",
                error_message=error_msg,
                processing_time_ms=elapsed_ms,
            )
        except Exception:
            # If DB update itself fails, log but don't mask the original error
            logger.exception("Failed to update image status to 'failed'")

        raise
