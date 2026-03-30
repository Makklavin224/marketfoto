# Roadmap: MarketFoto

## Overview

MarketFoto transforms a phone photo into a marketplace-ready product card in 30 seconds. The roadmap delivers this capability through 10 phases: starting with infrastructure and auth foundation, building the image processing pipeline (upload then background removal), constructing the template system and canvas editor, adding server-side rendering with export, integrating payments and credits, then completing with dashboard and landing page. Each phase delivers a complete vertical slice including its UI, so the product is testable end-to-end after Phase 7 and monetizable after Phase 8.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Infrastructure Foundation** - Docker Compose stack with 7 services, DB schema, MinIO buckets, health checks
- [ ] **Phase 2: Authentication & User System** - Registration, login, JWT, password reset, user profile, auth UI
- [ ] **Phase 3: Upload Pipeline** - Photo upload with validation, presigned URLs, MinIO storage, upload UI with drag-and-drop
- [ ] **Phase 4: Background Removal** - Async rembg processing via RQ worker, status polling, before/after preview UI
- [ ] **Phase 5: Template System** - Template data model, seed templates, API with filtering, template selector UI
- [ ] **Phase 6: Canvas Editor** - fabric.js editor with drag/resize, text editing, badges, marketplace switching, bundled fonts
- [ ] **Phase 7: Rendering & Export** - Server-side Pillow rendering, marketplace sizes, watermark, download, export panel UI
- [ ] **Phase 8: Payments & Credits** - YooKassa integration, subscriptions, one-time purchase, webhooks, credit enforcement, pricing/payment UI
- [ ] **Phase 9: Dashboard** - Card history grid, stats, download/delete management, empty states, pagination
- [ ] **Phase 10: Landing Page** - Hero, before/after, pricing, FAQ, SEO, mobile-first responsive

## Phase Details

### Phase 1: Infrastructure Foundation
**Goal**: The entire development environment runs with one command -- all 7 services start, connect, and pass health checks
**Depends on**: Nothing (first phase)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06, INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. `docker compose up` starts all 7 services (backend, worker, frontend, postgres, redis, minio, nginx) without errors
  2. GET /api/health returns 200 with status of all dependencies (DB, Redis, MinIO) confirmed connected
  3. Nginx correctly routes /api/* to backend and /* to frontend SPA
  4. MinIO has 3 buckets (originals, processed, rendered) accessible via S3 API
  5. PostgreSQL contains the full schema (users, images, templates, renders, payments tables) after initialization
**Plans:** 3 plans
Plans:
- [ ] 01-01-PLAN.md -- Docker Compose stack, environment, Nginx configs, Dockerfiles, frontend scaffold
- [x] 01-02-PLAN.md -- FastAPI application core, health check, SQLAlchemy models
- [ ] 01-03-PLAN.md -- Alembic migration setup, stack integration verification

### Phase 2: Authentication & User System
**Goal**: Users can create accounts, log in, and maintain authenticated sessions across the application
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, UI-01, UI-02
**Success Criteria** (what must be TRUE):
  1. User can register with email/password on /auth page and is assigned free plan with 3 credits
  2. User can log in and receive a JWT token that persists for 7 days
  3. User can request password reset via email and set a new password
  4. Authenticated user sees their name, plan badge, and remaining credits in the header
  5. Unauthenticated requests to protected endpoints receive 401 with clear error message
**Plans:** 3 plans
Plans:
- [ ] 02-01-PLAN.md -- Auth backend: schemas, service (pwdlib + PyJWT), dependency, router with 5 endpoints
- [ ] 02-02-PLAN.md -- Auth frontend: API client, auth store, React Router, AuthPage with tabs
- [ ] 02-03-PLAN.md -- UserBadge in Header, ProtectedRoute, router wiring, end-to-end verification
**UI hint**: yes

### Phase 3: Upload Pipeline
**Goal**: Users can upload product photos that are validated, stored securely, and ready for processing
**Depends on**: Phase 2
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-10, UPLD-11, UI-03
**Success Criteria** (what must be TRUE):
  1. User can drag-and-drop or select a photo (JPG/PNG/WebP, up to 10MB) and see upload progress
  2. Invalid files (wrong format, too large, too small) are rejected with a clear error message before upload
  3. Uploaded file appears in MinIO originals bucket at the correct path (originals/{user_id}/{image_id}.ext)
  4. User with 0 credits remaining gets a 403 and sees a message about upgrading their plan
  5. Oversized images (>4000px) are automatically resized before storage
**Plans**: TBD
**UI hint**: yes

### Phase 4: Background Removal
**Goal**: Users upload a product photo and get a clean cutout with transparent background in under 10 seconds
**Depends on**: Phase 3
**Requirements**: UPLD-05, UPLD-06, UPLD-07, UPLD-08, UPLD-09, UPLD-12, UI-04
**Success Criteria** (what must be TRUE):
  1. User clicks "Remove Background" and sees an animated processing indicator
  2. Background removal completes and user sees original (left) vs processed (right) comparison
  3. Processed PNG with alpha channel is stored in MinIO processed bucket
  4. Processing that exceeds 30 seconds is marked as failed with a clear error message
  5. RQ worker stays within 2GB memory limit and recycles after prolonged use (no memory leak)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Template System
**Goal**: Users can browse and select from marketplace-specific templates organized by category
**Depends on**: Phase 1
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, UI-05
**Success Criteria** (what must be TRUE):
  1. User sees a grid of template previews filterable by category and marketplace (WB/Ozon/YM)
  2. All 5 seed templates (clean-white, info-features, lifestyle-shadow, info-badge-hit, collage-two) are loaded and selectable
  3. Each template has a valid JSON config defining background, product area, text areas, and decorations
  4. Premium templates show a lock icon for free-plan users and return 403 with upgrade prompt on selection
**Plans**: TBD
**UI hint**: yes

### Phase 6: Canvas Editor
**Goal**: Users can visually compose their product card by positioning the photo, editing text, and toggling decorations on a template
**Depends on**: Phase 4, Phase 5
**Requirements**: EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05, EDIT-06, UI-10
**Success Criteria** (what must be TRUE):
  1. User can drag and resize the product photo on the template canvas
  2. User can click text areas and edit text inline with font size, color, and bold controls
  3. User can toggle badges/decorations on and off via the right panel
  4. Switching marketplace (WB/Ozon/YM) changes the canvas dimensions in real-time
  5. 15-20 Cyrillic fonts are available and render correctly in the editor
**Plans**: TBD
**UI hint**: yes

### Phase 7: Rendering & Export
**Goal**: Users get a pixel-perfect final card rendered server-side in the exact marketplace dimensions, ready to download
**Depends on**: Phase 6
**Requirements**: RNDR-01, RNDR-02, RNDR-03, RNDR-04, RNDR-05, RNDR-06, RNDR-07, RNDR-08, RNDR-09, RNDR-10, UI-06
**Success Criteria** (what must be TRUE):
  1. User clicks "Generate" and receives a final card rendered at the correct marketplace dimensions (WB 900x1200, Ozon 1200x1200, YM 800x800)
  2. Rendered card includes all elements from the editor (product photo, text, badges) composed via Pillow
  3. Free-plan renders have a "MarketFoto.ru" watermark (opacity 0.3) in the bottom-right corner
  4. User can download the card as PNG or JPG via a time-limited signed URL
  5. One credit is atomically deducted before rendering begins (no double-spend on concurrent clicks)
**Plans**: TBD
**UI hint**: yes

### Phase 8: Payments & Credits
**Goal**: Users can purchase subscriptions or single cards through YooKassa, and the credit system enforces plan limits correctly
**Depends on**: Phase 2
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, PAY-07, PAY-08, PAY-09, PAY-10, UI-07, UI-08, UI-09
**Success Criteria** (what must be TRUE):
  1. User can view pricing page with 3 plans (Free/Starter 499r/Business 990r), monthly/annual toggle, and one-time purchase option
  2. User can initiate payment, be redirected to YooKassa, and return to a success page showing their new plan
  3. YooKassa webhook correctly updates user plan, credits, and subscription expiry with idempotent processing
  4. User who runs out of credits sees a modal with upgrade options (subscription or one-time 49r purchase)
  5. Expired subscriptions automatically revert to free plan with 3 credits via daily cron job
**Plans**: TBD
**UI hint**: yes

### Phase 9: Dashboard
**Goal**: Users can view, manage, and re-download all their previously created product cards
**Depends on**: Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05
**Success Criteria** (what must be TRUE):
  1. User sees a stats summary (current plan, credits remaining, cards this month, total cards)
  2. User sees a grid of their cards (4 columns desktop, 2 mobile) with thumbnails, marketplace badges, and dates
  3. User can download any card as PNG/JPG and delete cards they no longer need
  4. Grid supports pagination (load more) for users with many cards
  5. New users see an empty state with "Create your first card" call to action
**Plans**: TBD
**UI hint**: yes

### Phase 10: Landing Page
**Goal**: Visitors understand the product value, see proof it works, and convert to free signups within one scroll
**Depends on**: Phase 2
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, LAND-05, LAND-06, LAND-07, LAND-08, LAND-09, LAND-10
**Success Criteria** (what must be TRUE):
  1. Visitor sees a hero section with headline, before/after slider, and "Try Free" CTA
  2. Visitor can scroll through How It Works (3 steps), Before/After examples, marketplace logos, pricing cards, and FAQ
  3. Pricing section shows 3 plans with month/year toggle matching the app pricing page
  4. Page is fully responsive (mobile-first, breakpoints at 640/768/1024/1280)
  5. LCP is under 3 seconds with lazy-loaded images and proper SEO meta tags
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10
Note: Phase 5 depends only on Phase 1 and can be parallelized with Phases 3-4 if desired.
Phase 8 depends only on Phase 2 and can be parallelized with Phases 3-7 if desired.
Phase 10 depends only on Phase 2 and can be parallelized with later phases if desired.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Infrastructure Foundation | 0/3 | Planned | - |
| 2. Authentication & User System | 0/3 | Planned | - |
| 3. Upload Pipeline | 0/? | Not started | - |
| 4. Background Removal | 0/? | Not started | - |
| 5. Template System | 0/? | Not started | - |
| 6. Canvas Editor | 0/? | Not started | - |
| 7. Rendering & Export | 0/? | Not started | - |
| 8. Payments & Credits | 0/? | Not started | - |
| 9. Dashboard | 0/? | Not started | - |
| 10. Landing Page | 0/? | Not started | - |
