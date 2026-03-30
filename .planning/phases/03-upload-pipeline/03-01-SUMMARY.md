---
phase: 03-upload-pipeline
plan: 01
subsystem: backend/images
tags: [upload, minio, validation, presigned-urls, images-api]
dependency_graph:
  requires: [01-01, 01-02, 02-01]
  provides: [minio-service, image-validation, images-api, images-schemas]
  affects: [04-bg-removal, 03-02]
tech_stack:
  added: [minio-sdk, pillow-resize]
  patterns: [presigned-url-flow, magic-byte-validation, auto-resize]
key_files:
  created:
    - backend/app/services/minio.py
    - backend/app/services/images.py
    - backend/app/schemas/images.py
    - backend/app/api/images.py
  modified:
    - backend/app/main.py
decisions:
  - Simplified presigned flow: client uploads multipart to backend, backend validates then uploads to MinIO (not pure client-side presigned PUT)
  - Store MinIO object path in DB, generate fresh presigned GET URLs on read
  - Auto-resize at 4000px threshold using LANCZOS resampling
metrics:
  duration: 3min
  completed: "2026-03-30T13:04:00Z"
  tasks_completed: 2
  tasks_total: 2
requirements_covered: [UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-10, UPLD-11]
---

# Phase 03 Plan 01: Upload Pipeline Backend Summary

MinIO presigned URL service + image validation (magic bytes, dimensions, auto-resize) + 5-endpoint images API with full CRUD and background removal trigger.

## What Was Built

### MinIO Service (`backend/app/services/minio.py`)
- Client initialization from `settings.s3_endpoint/s3_access_key/s3_secret_key`
- `get_presigned_put_url()` / `get_presigned_get_url()` for URL generation
- `upload_bytes()` / `download_bytes()` / `delete_object()` / `object_exists()` for CRUD
- `ensure_buckets()` for startup bucket creation
- Three buckets: `originals`, `processed`, `rendered`

### Image Validation Service (`backend/app/services/images.py`)
- `validate_magic_bytes()` -- checks JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF+WEBP)
- `validate_file_size()` -- max 10MB
- `validate_dimensions()` -- min 200x200, max 8000x8000
- `resize_if_needed()` -- auto-resize to 4000px max side using LANCZOS, quality 95 for JPEG/WebP
- `get_extension_from_mime()` / `get_image_dimensions()`

### Pydantic Schemas (`backend/app/schemas/images.py`)
- `ImageResponse` -- full image record with `from_attributes=True`
- `UploadInitResponse` -- presigned URL response
- `UploadConfirmResponse` -- wraps ImageResponse
- `ImageStatusResponse` -- lightweight polling response
- `ErrorResponse` -- standard error shape

### Images Router (`backend/app/api/images.py`)
- `POST /api/images/upload` -- multipart upload with full validation chain, returns 201
- `GET /api/images/{image_id}` -- returns image with fresh presigned URLs
- `GET /api/images/{image_id}/status` -- lightweight polling for background removal
- `DELETE /api/images/{image_id}` -- removes from MinIO + DB, returns 204
- `POST /api/images/{image_id}/remove-background` -- 409 on duplicate, sets status to processing (RQ enqueue is Phase 4)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | MinIO service, image validation, Pydantic schemas | 7d4304c | services/minio.py, services/images.py, schemas/images.py |
| 2 | Images router with 5 endpoints, main.py wiring | d0bc43f | api/images.py, main.py |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved merge conflict in main.py**
- **Found during:** Task 2
- **Issue:** main.py had unresolved git merge conflict markers between auth_router and templates_router
- **Fix:** Resolved to include both routers (auth + templates), then added images_router
- **Files modified:** backend/app/main.py

## Requirements Coverage

| Requirement | Implementation |
|-------------|---------------|
| UPLD-01 | Upload accepts JPG/PNG/WebP up to 10MB, 200x200 to 8000x8000 |
| UPLD-02 | Magic bytes validation prevents renamed non-image files |
| UPLD-03 | Files stored at `originals/{user_id}/{image_id}.{ext}` in MinIO |
| UPLD-04 | Credits check returns 403 when credits_remaining == 0 |
| UPLD-10 | Images > 4000px auto-resized with LANCZOS before storage |
| UPLD-11 | Duplicate remove-background returns 409 |

## Known Stubs

None -- all endpoints are fully functional. Phase 4 will add RQ job enqueue to the remove-background endpoint.

## Self-Check: PASSED
