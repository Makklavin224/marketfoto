---
phase: 07-rendering-export
plan: 01
subsystem: api
tags: [fastapi, pydantic, sqlalchemy, redis-rq, minio, credit-system]

requires:
  - phase: 01-infrastructure-foundation
    provides: User model with credits_remaining, Render model, MinIO service, database
  - phase: 03-upload-processing
    provides: Image model with processed_url for validation
  - phase: 05-templates-seed
    provides: Template model for validation

provides:
  - POST /api/renders endpoint with atomic credit deduction and RQ job enqueue
  - GET /api/renders paginated list with presigned URLs
  - GET /api/renders/{id}/status polling endpoint
  - DELETE /api/renders/{id} with MinIO cleanup
  - RenderCreateRequest, RenderResponse, RenderStatusResponse, RenderListResponse Pydantic schemas
  - MARKETPLACE_SIZES constant (wb=900x1200, ozon=1200x1200, ym=800x800)

affects: [07-rendering-export, 09-dashboard-landing]

tech-stack:
  added: []
  patterns: [atomic-credit-deduction-sql, render-status-derivation-from-output-url]

key-files:
  created:
    - backend/app/schemas/render.py
    - backend/app/api/renders.py
  modified:
    - backend/app/main.py

key-decisions:
  - "Atomic credit deduction via single UPDATE WHERE credits_remaining > 0 RETURNING -- prevents double-spend on concurrent requests"
  - "Render status derived from output_url presence (null=pending, non-null=complete) rather than separate status column"
  - "402 Payment Required for insufficient credits -- standard HTTP code for payment-gated resources"

patterns-established:
  - "Atomic credit deduction: UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = :id AND credits_remaining > 0 RETURNING credits_remaining"
  - "Render response helper: _render_to_response generates fresh presigned URLs on every read"

requirements-completed: [RNDR-01, RNDR-05, RNDR-07, RNDR-08, RNDR-09, RNDR-10]

duration: 3min
completed: 2026-03-30
---

# Phase 7 Plan 01: Renders API Backend Summary

**Renders API with 4 endpoints, atomic credit deduction via single UPDATE WHERE credits_remaining > 0, and RQ job enqueue for Pillow rendering pipeline**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T15:20:33Z
- **Completed:** 2026-03-30T15:24:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 8 Pydantic schemas covering overlay_data structure (product, texts, badge), render request/response, and paginated list
- 4 API endpoints: create (202), list (200), status (200), delete (204)
- Atomic credit deduction prevents double-spend on concurrent render requests
- RQ job enqueue with 60s timeout (longer than bg removal's 30s)

## Task Commits

Each task was committed atomically:

1. **Task 1: Pydantic schemas for renders API** - `7c0bbec` (feat)
2. **Task 2: Renders API router with 4 endpoints and atomic credit deduction** - `71a190f` (feat)

## Files Created/Modified
- `backend/app/schemas/render.py` - 8 Pydantic models for renders API request/response
- `backend/app/api/renders.py` - Renders router with create, list, status, delete endpoints
- `backend/app/main.py` - Added renders_router registration

## Decisions Made
- Atomic credit deduction via single UPDATE WHERE credits_remaining > 0 RETURNING -- prevents double-spend
- Status derived from output_url presence rather than separate DB column -- simpler, no state sync issues
- 402 Payment Required for insufficient credits -- standard HTTP semantics

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Renders API ready for worker implementation (Plan 02) and frontend wiring (Plan 03)
- POST /api/renders enqueues `worker.tasks.render_card_job` which Plan 02 will implement

---
*Phase: 07-rendering-export*
*Completed: 2026-03-30*
