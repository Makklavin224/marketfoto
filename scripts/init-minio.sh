#!/bin/sh
# MinIO bucket initialization script
# This documents what the minio-init Docker Compose service does.
# The actual init runs as an inline command in docker-compose.yml using the mc (MinIO Client) image.
#
# Buckets created:
#   - originals: Raw uploaded photos from users
#   - processed: Photos with background removed (rembg output)
#   - rendered:  Final marketplace-ready card images

set -e

MC_ALIAS="myminio"
MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"

echo "Configuring MinIO alias..."
mc alias set "$MC_ALIAS" "$MINIO_ENDPOINT" "$MINIO_USER" "$MINIO_PASSWORD"

echo "Creating buckets..."
mc mb --ignore-existing "$MC_ALIAS/originals"
mc mb --ignore-existing "$MC_ALIAS/processed"
mc mb --ignore-existing "$MC_ALIAS/rendered"

echo "MinIO initialization complete."
echo "Buckets:"
mc ls "$MC_ALIAS"
