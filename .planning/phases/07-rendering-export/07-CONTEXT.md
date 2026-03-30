# Phase 7: Rendering & Export - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** SPECIFICATION.md Module 3 (Templates & Editor)

<domain>
## Phase Boundary

Server-side Pillow rendering of final cards from overlay_data + template config. Marketplace dimension resizing. Watermark for free plan. Download via signed URL. Export panel UI. Render history API.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** POST /api/renders — accepts image_id + template_id + overlay_data + marketplace → Pillow composites all layers → saves to MinIO rendered/ → returns URL
- **D-02:** Pillow rendering: background (from template) + product photo (positioned per overlay_data.product) + text (per overlay_data.texts) + decorations (badges etc)
- **D-03:** Resize to marketplace: WB 900x1200, Ozon 1200x1200, ЯМ 800x800
- **D-04:** Free plan watermark: "MarketFoto.ru" opacity 0.3, size 10% of width, bottom-right corner
- **D-05:** Credit deduction: atomic UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id=? AND credits_remaining > 0 BEFORE rendering
- **D-06:** Download: signed GET URL from MinIO, expires 1 hour. Support PNG and JPG
- **D-07:** GET /api/renders — history with pagination (limit, offset, sort=created_at:desc)
- **D-08:** DELETE /api/renders/{id} — remove render + file from MinIO
- **D-09:** ExportPanel UI: preview, size info, download PNG/JPG buttons, "Создать ещё", "Редактировать"
- **D-10:** Bundled fonts (same as canvas editor) must be in Pillow render Docker image

### Claude's Discretion
- pycairo vs pure Pillow for text rendering
- Font file management in Docker image
- Image quality settings for JPG export
- Render queue (sync vs async via RQ)

</decisions>

<canonical_refs>
## Canonical References

- `docs/SPECIFICATION.md` — Module 3: renders table, POST /api/renders, overlay_data structure, ExportPanel component
- `.planning/research/ARCHITECTURE.md` — Rendering strategy, Pillow+pycairo approach
- `CLAUDE.md` — Pillow ~12.1, pycairo ~1.29

</canonical_refs>

<code_context>
- Phase 6: Canvas editor produces overlay_data JSON (fabric.js serialization)
- Phase 5: Template configs with background, product_area, text_areas, decorations
- Phase 1: Render SQLAlchemy model, MinIO service

</code_context>

<specifics>
- overlay_data: { product: {x,y,width,height,rotation}, texts: [{area_id, content, fontSize, color}], badge: {enabled, text} }
- Font rendering must match canvas preview as closely as possible (controlled font set helps)

</specifics>

<deferred>
- Batch rendering — v2
- PDF export — not needed for marketplaces

</deferred>

---
*Phase: 07-rendering-export*
