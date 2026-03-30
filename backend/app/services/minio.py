"""MinIO client wrapper: presigned PUT/GET URLs, upload, download, delete."""

from __future__ import annotations

from datetime import timedelta
from io import BytesIO

from minio import Minio, S3Error

from app.config import settings

# Parse endpoint: remove http:// or https:// prefix for Minio client
_endpoint = settings.s3_endpoint.replace("http://", "").replace("https://", "")
_secure = settings.s3_endpoint.startswith("https://")

client = Minio(
    _endpoint,
    access_key=settings.s3_access_key,
    secret_key=settings.s3_secret_key,
    secure=_secure,
)

BUCKET_ORIGINALS = "originals"
BUCKET_PROCESSED = "processed"
BUCKET_RENDERED = "rendered"


def ensure_buckets() -> None:
    """Create buckets if they don't exist (called at startup)."""
    for bucket in (BUCKET_ORIGINALS, BUCKET_PROCESSED, BUCKET_RENDERED):
        if not client.bucket_exists(bucket):
            client.make_bucket(bucket)


def get_presigned_put_url(
    bucket: str,
    object_name: str,
    expires: timedelta = timedelta(minutes=5),
) -> str:
    """Generate presigned PUT URL for direct client upload."""
    return client.presigned_put_object(bucket, object_name, expires=expires)


def _rewrite_url(url: str) -> str:
    """Replace internal minio:9000 with public endpoint for browser access."""
    public = settings.s3_public_endpoint
    if public:
        internal = settings.s3_endpoint
        return url.replace(internal, public).replace(
            internal.replace("http://", "").replace("https://", ""),
            public.replace("http://", "").replace("https://", ""),
        )
    return url


def get_presigned_put_url(
    bucket: str,
    object_name: str,
    expires: timedelta = timedelta(minutes=5),
) -> str:
    """Generate presigned PUT URL for direct client upload."""
    return _rewrite_url(client.presigned_put_object(bucket, object_name, expires=expires))


def get_presigned_get_url(
    bucket: str,
    object_name: str,
    expires: timedelta = timedelta(hours=1),
) -> str:
    """Generate presigned GET URL for viewing/downloading."""
    return _rewrite_url(client.presigned_get_object(bucket, object_name, expires=expires))


def upload_bytes(
    bucket: str,
    object_name: str,
    data: bytes,
    content_type: str,
) -> None:
    """Upload bytes directly to MinIO."""
    client.put_object(
        bucket,
        object_name,
        BytesIO(data),
        len(data),
        content_type=content_type,
    )


def download_bytes(bucket: str, object_name: str) -> bytes:
    """Download object from MinIO as bytes."""
    response = client.get_object(bucket, object_name)
    try:
        return response.read()
    finally:
        response.close()
        response.release_conn()


def delete_object(bucket: str, object_name: str) -> None:
    """Delete object from MinIO."""
    client.remove_object(bucket, object_name)


def object_exists(bucket: str, object_name: str) -> bool:
    """Check if object exists in bucket."""
    try:
        client.stat_object(bucket, object_name)
        return True
    except S3Error:
        return False
