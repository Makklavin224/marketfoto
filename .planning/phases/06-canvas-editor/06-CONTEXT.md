# Phase 6: Canvas Editor - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** SPECIFICATION.md Module 3 (Templates & Editor)

<domain>
## Phase Boundary

fabric.js canvas editor: drag/resize product photo on template, inline text editing, badge toggles, marketplace dimension switching, font selection. Right panel with controls. NO rendering (Phase 7).

</domain>

<decisions>
## Implementation Decisions

- **D-01:** fabric.js v7.2 via useRef/useEffect (NOT fabricjs-react wrapper per CLAUDE.md)
- **D-02:** Left panel (70%): Canvas with template background, draggable/resizable product photo, clickable text areas, badge toggles, zoom +/-
- **D-03:** Right panel (30%): Marketplace radio (WB/Ozon/ЯМ changes canvas dimensions), text inputs per template text_area, style controls (fontSize slider, color picker, bold/italic), badge toggle + text
- **D-04:** Marketplace dimensions: WB 900x1200, Ozon 1200x1200, ЯМ 800x800
- **D-05:** 15-20 bundled Cyrillic fonts (Montserrat, Inter, Golos, Rubik, Nunito + more)
- **D-06:** Canvas state serialized as JSON (fabric.js built-in) for save/load
- **D-07:** Button "Создать карточку" (green, bottom) → POST /api/renders with overlay_data
- **D-08:** States: editing (normal), rendering (spinner + "Создаём карточку..."), done (preview + download)

### Claude's Discretion
- Font loading strategy (Google Fonts API vs bundled woff2)
- Canvas zoom implementation details
- Undo/redo approach (if any for MVP)
- Mobile responsive canvas behavior

</decisions>

<canonical_refs>
## Canonical References

- `docs/SPECIFICATION.md` — Module 3: CardEditor component, overlay_data structure, text_area definitions
- `.planning/research/STACK.md` — fabric.js v7.2, zustand for canvas state
- `.planning/research/ARCHITECTURE.md` — Rendering strategy, font handling

</canonical_refs>

<code_context>
## Existing Code Insights

- Phase 5: TemplateSelector navigates to editor with template_id
- Phase 4: BackgroundPreview navigates to template selector with image_id
- Phase 2: Auth store, API client with JWT

</code_context>

<specifics>
- overlay_data JSON structure: { product: {x,y,width,height,rotation}, texts: [{area_id, content, fontSize, color}], badge: {enabled, text} }
- Template config defines text_areas with exact positions — editor must respect these zones

</specifics>

<deferred>
- Undo/redo history — nice-to-have, not in MVP scope
- Layers panel — overkill for card editing

</deferred>

---
*Phase: 06-canvas-editor*
*Context gathered: 2026-03-30*
