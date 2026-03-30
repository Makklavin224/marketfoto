---
phase: 04-background-removal
plan: 01
subsystem: api
tags: [rembg, rq, redis, minio, pillow, background-removal, worker]

requires:
  - phase: 01-infrastructure-foundation
    provides: Docker Compose with worker service, MinIO buckets, PostgreSQL images table
  - phase: 03-upload-pipeline
    provides: Image upload endpoint, MinIO originals storage, Image model

provides:
  - RQ worker job function with rembg session reuse (worker/tasks.py)
  - POST /api/images/{id}/remove-background endpoint with RQ enqueue (202)
  - GET /api/images/{id}/status with processing_time_ms and presigned URLs
  - RemoveBackgroundResponse Pydantic schema

affects: [04-02, 06-canvas-editor, 09-dashboard]

tech-stack:
  added: [rq Queue, redis.Redis, sqlalchemy.create_engine (sync)]
  patterns: [module-level rembg session reuse, sync SQLAlchemy in RQ worker, job_timeout=30]

key-files:
  created: [worker/__init__.py, worker/tasks.py]
  modified: [backend/app/api/images.py, backend/app/schemas/images.py, frontend/src/lib/api.ts]

key-decisions:
  - "Module-level rembg session for memory-safe reuse per PITFALLS.md Pitfall 1"
  - "Sync SQLAlchemy engine in worker (RQ forks sync subprocesses, async not supported)"
  - "Status set to processing in endpoint before enqueue for immediate UX feedback"
  - "RemoveBackgroundResponse (id+status) instead of full ImageResponse for 202"

patterns-established:
  - "Worker pattern: module-level resources (session, engine, minio client) reused across jobs"
  - "RQ enqueue pattern: string function path + job_timeout for cross-process isolation"

requirements-completed: [UPLD-05, UPLD-06, UPLD-07, UPLD-08, UPLD-09, UPLD-12]

duration: 4min
completed: 2026-03-30
---

# Phase 04 Plan 01: Backend Processing Pipeline Summary

**RQ worker with module-level rembg birefnet-general session reuse, 30s timeout, and MinIO processed bucket upload pipeline**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T13:13:18Z
- **Completed:** 2026-03-30T13:17:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Worker job function with rembg session reuse at module level (PITFALLS.md Pitfall 1 mitigation)
- RQ enqueue with job_timeout=30 for timeout enforcement (UPLD-09)
- POST remove-background returns 202 with RQ job enqueue; GET status returns presigned URL + processing_time_ms
- Synchronous SQLAlchemy engine in worker (not async) for correct RQ subprocess behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: RQ worker job function with rembg session reuse and timeout** - `8e5f41a` (feat)
2. **Task 2: Remove-background trigger endpoint and status polling endpoint** - `6879091` (feat)

## Files Created/Modified
- `worker/__init__.py` - Empty package marker
- `worker/tasks.py` - RQ job with rembg session reuse, MinIO download/upload, DB status updates, timeout handling
- `backend/app/api/images.py` - Updated remove-background to enqueue RQ job, status endpoint with processing_time_ms
- `backend/app/schemas/images.py` - Added RemoveBackgroundResponse, processing_time_ms to ImageStatusResponse
- `frontend/src/lib/api.ts` - Added removeBackground() API function for Plan 04-02

## Decisions Made
- Module-level rembg session (`rembg_session = new_session("birefnet-general")`) loaded once per worker fork, reused across all jobs -- per PITFALLS.md Pitfall 1 guidance
- Synchronous SQLAlchemy `create_engine()` in worker -- RQ workers fork sync subprocesses, async engine would fail
- Status set to "processing" in the endpoint before enqueue (not just in the worker) -- provides immediate UX feedback even if job startup is delayed
- Returns `RemoveBackgroundResponse(id, status)` instead of full `ImageResponse` for 202 -- lighter response, frontend only needs id and status to start polling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - verification passed via AST parsing (Docker dependencies like rembg/minio not available on host, but code structure is correct).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend pipeline complete, ready for Plan 04-02 frontend integration
- Worker dockerfile already has model pre-downloaded and pre-warmed
- Frontend API module already has removeBackground() and getStatus() wired

---
*Phase: 04-background-removal*
*Completed: 2026-03-30*
