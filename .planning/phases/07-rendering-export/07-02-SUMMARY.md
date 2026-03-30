---
phase: 07-rendering-export
plan: 02
subsystem: worker
tags: [pillow, pycairo, rq-worker, minio, fonts, watermark, image-compositing]

requires:
  - phase: 01-infrastructure-foundation
    provides: Worker Dockerfile, MinIO buckets, PostgreSQL
  - phase: 04-background-removal
    provides: processed images in MinIO processed bucket, worker/tasks.py pattern

provides:
  - render_card_job function with full Pillow compositing pipeline
  - 14 Cyrillic TTF font families in worker Docker image
  - Watermark for free plan users (MarketFoto.ru, opacity 0.3)
  - Shadow rendering via GaussianBlur on product silhouette
  - Badge and line decoration rendering

affects: [07-rendering-export, 09-dashboard-landing]

tech-stack:
  added: [pycairo, numpy-gradient-rendering]
  patterns: [pillow-compositing-pipeline, font-fallback-chain, numpy-gradient]

key-files:
  created:
    - worker/fonts/ (16 TTF files)
    - worker/fonts/README.md
  modified:
    - worker/tasks.py
    - worker/Dockerfile

key-decisions:
  - "Variable TTF fonts for most families -- single file supports all weights via Pillow truetype()"
  - "Shadow rendering via GaussianBlur on product alpha silhouette -- composited BEFORE product for correct z-order"
  - "Numpy gradient rendering instead of pixel-by-pixel loop -- orders of magnitude faster for large images"
  - "Font fallback chain: specific weight -> variable font -> Inter fallback -> Pillow default"

patterns-established:
  - "Font loading: _load_font(family, size, weight) with 3-level fallback chain"
  - "Color parsing: _hex_to_rgba handles both #RRGGBB and rgba(r,g,b,a) formats"
  - "Render pipeline order: background -> shadow -> product -> text -> decorations -> watermark"

requirements-completed: [RNDR-02, RNDR-03, RNDR-04, RNDR-06]

duration: 4min
completed: 2026-03-30
---

# Phase 7 Plan 02: Pillow Rendering Pipeline Summary

**Full Pillow compositing pipeline with 14 Cyrillic TTF fonts, numpy gradients, shadow/badge/line decorations, and free-plan watermark at 0.3 opacity**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-30T15:24:00Z
- **Completed:** 2026-03-30T15:28:00Z
- **Tasks:** 2
- **Files modified:** 19 (16 font files + tasks.py + Dockerfile + README)

## Accomplishments
- 16 TTF font files downloaded from Google Fonts GitHub (12 variable + 4 static)
- Worker Dockerfile updated with pycairo, libcairo2-dev, libfreetype6-dev, and FONTS_DIR
- render_card_job composites all layers: background + shadow + product + text + badges/lines + watermark
- Numpy-powered gradient rendering for performance-critical backgrounds

## Task Commits

Each task was committed atomically:

1. **Task 1: Download TTF fonts and update worker Dockerfile** - `2df36c6` (feat)
2. **Task 2: render_card_job with Pillow compositing** - `7e1fc3b` (feat)

## Files Created/Modified
- `worker/fonts/*.ttf` (16 files) - Cyrillic TTF fonts matching frontend font set
- `worker/fonts/README.md` - Font documentation with family table and sources
- `worker/tasks.py` - Added render_card_job + 4 helper functions (386 lines)
- `worker/Dockerfile` - Added font rendering dependencies and COPY fonts/

## Decisions Made
- Variable TTF fonts for most families -- single file for all weights, simpler management
- Shadow composited BEFORE product image for correct z-order (shadow behind product)
- Numpy gradient instead of putpixel loop -- critical for 1200x1200 images
- Font fallback chain prevents crashes when specific weights are unavailable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Google Fonts download endpoint returns content-length: 0 (requires browser JavaScript). Used raw GitHub repository URLs instead -- all 16 TTF files downloaded successfully.

## User Setup Required
None - fonts are baked into Docker image at build time.

## Next Phase Readiness
- render_card_job ready to be called by RQ queue (enqueued by POST /api/renders from Plan 01)
- Frontend ExportPanel (Plan 03) can now poll for completion and download rendered cards

---
*Phase: 07-rendering-export*
*Completed: 2026-03-30*
