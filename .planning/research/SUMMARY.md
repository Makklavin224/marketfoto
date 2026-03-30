# Project Research Summary

**Project:** MarketFoto
**Domain:** Marketplace product card generation SaaS (Russian market: WB, Ozon, Yandex.Market)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

MarketFoto is a zero-marginal-cost image processing SaaS targeting Russian marketplace sellers on Wildberries, Ozon, and Yandex.Market. The product sits in a well-defined market (8+ direct competitors: WBCard, Neiro-Card, Fabula AI, Wondercard, 24AI, Flyvi, SUPA, Photoroom) with a clear structural advantage: self-hosted rembg + Pillow costs ~0.5 rub/card vs competitors paying 5-30 rub/card to cloud AI APIs. This makes 990 rub/mo unlimited the most aggressive pricing in the Russian market — sustainable for MarketFoto, impossible to match for API-dependent competitors. The technology stack is mature: FastAPI + RQ + Pillow + fabric.js is the canonical approach for this class of product, and all version choices have been confirmed against current stable releases as of 2026-03-30.

The recommended architecture is a 7-service Docker Compose stack (Nginx, FastAPI, RQ Worker, PostgreSQL, Redis, MinIO, React SPA). The critical path flows through infrastructure foundation, presigned upload pipeline, background removal worker, canvas editor, server-side rendering, then payment system. All components use proven patterns with no novel engineering required. The single most uncertain component is canvas-to-Pillow rendering fidelity — fabric.js uses browser font metrics while Pillow uses FreeType, producing measurably different Cyrillic text output. This must be prototyped as a spike before the full canvas editor is built, not discovered in production.

Three risks demand early action: (1) rembg memory leak — the ONNX session accumulates memory unboundedly, and on the shared VPS (which also runs MasterPlatform and Signal Digest AI) this is existential; Docker memory limits + session reuse are required from day one. (2) Template library depth — 5 templates is a technology demo, not a product; 50+ templates across 10 niches is the minimum competitive bar, and this is a design/content effort that should start immediately in parallel with engineering. (3) YooKassa recurring payment approval — production auto-renewals require contacting a YooKassa account manager; the lead time is unknown and must be initiated during Phase 1, not on launch day.

## Key Findings

### Recommended Stack

The stack is built on Python 3.12 (not 3.13 — passlib and onnxruntime have compatibility ceilings at 3.12) with FastAPI ~0.135 as the async API framework. Background removal uses rembg with the `birefnet-general` model — significantly better edge quality than the default u2net for clothing, glass, and complex product edges, at the cost of ~75% more CPU time (~4-6s vs ~2-3s) and ~1.5GB RAM. All image processing is asynchronous via Redis RQ (not Celery — 10x simpler for single-queue work). Object storage is self-hosted MinIO (S3-compatible, zero monthly cost). The frontend uses React 19 + Vite 8 (Rolldown-powered, released 2026-03-12, 10-30x faster builds) + TailwindCSS 4.2 (CSS-first config, no tailwind.config.js needed). Canvas editing uses fabric.js v7.2 directly via React useRef — no wrapper library.

Two key security library replacements from common defaults: PyJWT replaces python-jose (abandoned since 2021 with known CVEs), and pwdlib[argon2] replaces passlib (breaks on Python 3.13). Both are now the FastAPI-documented recommendations.

**Core technologies:**
- Python 3.12 + FastAPI ~0.135: async API, automatic OpenAPI docs, native file upload support — developer already experienced
- rembg (birefnet-general) + Pillow ~12.1 + pycairo ~1.29: background removal, server-side card rendering, vector/text overlays
- Redis 7.x + RQ ~2.7: async job queue for all image processing (2-6s CPU jobs must never block the request handler)
- PostgreSQL 16 + SQLAlchemy ~2.0 + asyncpg: primary store with JSONB for template metadata, full-text search for Russian
- MinIO (self-hosted, S3-compatible): originals / bg-removed / rendered cards in three buckets with lifecycle policies
- React 19 + Vite 8 + TailwindCSS 4.2: frontend with Rolldown build tool and CSS-first styling
- fabric.js ~7.2: canvas editor — drag/resize/rotate/text/serialization; use directly via useRef, not through a React wrapper
- @tanstack/react-query ~5.95 + zustand ~5.0: server state (polling job status) and client state (canvas editor)
- yookassa ~3.10 + PyJWT + pwdlib[argon2]: Russian payment processing, JWT auth, Argon2 password hashing

### Expected Features

The competitive landscape confirms 12 non-negotiable features for a viable product. The single biggest gap in the current plan: 5 templates is not competitive — WBCard ships 300+, Fabula ships hundreds. Launching with fewer than 50 templates guarantees immediate churn.

**Must have (table stakes):**
- Background removal — core "magic moment," every competitor has it; birefnet-general model for quality
- 50+ templates across 10 niches — minimum competitive bar (clothing, electronics, cosmetics, food, home goods, children's, tools, sports, auto, jewelry)
- Canvas drag-and-drop editor — fabric.js with move/resize/rotate/text edit/undo-redo
- Marketplace-correct export sizes — WB (900x1200), Ozon (1200x1200), YM (800x800) with safe-zone overlays
- Text overlay with 15-20 bundled Cyrillic fonts — Montserrat, Inter, Golos, Rubik, Nunito
- Infographic elements library — 100+ pre-made badges and icons in Russian ("Хит продаж," "Новинка," "-30%")
- Multiple slides per product — WB allows 10 images, Ozon 15; one project = multiple canvas slides
- Dashboard with card history — grid view, re-edit, bulk download, search/filter by marketplace
- Processing status indicator — SSE or polling with animated skeleton states
- YooKassa payment integration — subscriptions (499/990 rub/mo) + one-time (49 rub/card)
- Free tier with server-side watermark — 3 cards/month; conversion lever
- Auth (email/password + JWT + email verification) — baseline SaaS requirement

**Should have (differentiators):**
- 30-second end-to-end speed — THE killer feature; measure and optimize aggressively, pre-warm the pipeline
- Unlimited plan at 990 rub/mo — most aggressive offer in the Russian market; structurally sustainable
- One-time purchase at 49 rub/card — no direct competitor equivalent; converts casual and infrequent sellers
- Russian-first UX — every string, font, template, and export preset explicitly for WB/Ozon/YM
- Niche-specific template auto-suggestion — detect product category from photo, suggest the 5 best templates

**Defer (v2+):**
- Batch processing (20+ photos at once) — needed to retain users past month 2; not launch-blocking
- AI text generation (YandexGPT/GigaChat) — Russian-language feature bullets for infographic cards
- AI background generation (Kandinsky API) — needed to compete with Fabula/24AI long-term
- Custom font upload — 15-20 curated fonts cover 95% of use cases
- Direct marketplace upload via WB/Ozon API — high-value Phase 3 engineering
- Team accounts, API access, template marketplace — after proving product-market fit

**Never build:**
- Full Canva-clone graphic design suite — scope creep; stay laser-focused on marketplace product cards
- Mobile native app — desktop web is appropriate for the editing workflow
- Marketplace analytics/SEO dashboards — MPStats/Moneyplace territory; different product
- Video card generation — 10x complexity increase; different product category

### Architecture Approach

The architecture is a standard API-gateway + async-worker + object-storage pattern, well-suited for single-VPS Docker Compose deployment. Clients upload directly to MinIO via presigned PUT URLs (FastAPI never buffers image bytes in memory). FastAPI enqueues all image processing to RQ workers. Workers write results to MinIO, update status in Redis, and update metadata in PostgreSQL. The client polls a lightweight status endpoint. Templates are stored as structured JSON in PostgreSQL JSONB columns, enabling both fabric.js canvas reconstruction on the client and Pillow rendering on the server from the same source of truth.

The critical architectural decision is rendering strategy. The recommended approach (Hybrid Option C) uses Pillow for template-based rendering (predictable fixed layouts with constrained editor) plus a client-side canvas export escape hatch. This avoids adding headless Chromium (~400MB RAM, Node.js dependency) while accepting that the canvas editor must constrain users to template-safe operations — which is what the product actually needs.

**Major components:**
1. Nginx — sole public entry point; TLS, upload size limits (10MB), static file serving, rate limiting
2. FastAPI API (2 Uvicorn workers) — auth, metadata CRUD, presigned URL generation, job enqueue, webhook handling; never touches image bytes directly
3. RQ Worker (2 replicas, 2GB RAM limit each) — rembg background removal, Pillow rendering, watermarking; CPU-intensive, fully isolated from API
4. PostgreSQL 16 — users, credits, templates (JSONB), renders, payments, processed webhooks for idempotency
5. Redis 7 — RQ job queue, job status/progress hashes, per-user distributed locks, rate limiting
6. MinIO — three-bucket layout: originals/ (30d retention), processed/ (30d), rendered/ (90d)
7. React SPA — fabric.js canvas editor, presigned upload flow, job status polling, dashboard

### Critical Pitfalls

1. **rembg memory leak crashes the shared VPS** — the ONNX session accumulates memory unboundedly under load (documented growth to 137GB in reports). On a VPS shared with MasterPlatform and Signal Digest AI, the OOM killer can take down PostgreSQL mid-transaction. Fix: pre-initialize a single rembg session at worker startup (pass it to every `remove()` call), set Docker memory limit of 2GB per worker, use forking RQ Worker (never SimpleWorker), recycle worker process after 50-100 jobs.

2. **Insufficient template library at launch** — 5 templates will not convert users who compare against WBCard (300+). The solution is non-engineering: source Figma community marketplace card packs, adapt free Russian marketplace template designs, or budget 2-3 days of designer time. This is the single highest-risk item for a successful launch — start immediately.

3. **Frontend-backend rendering mismatch** — fabric.js (browser canvas + browser font metrics) and Pillow (FreeType rasterizer) produce measurably different text output for Cyrillic characters. Text overflows, line heights differ, badge text misaligns. Fix: constrain the editor to template zones with a small bundled font set tested for rendering parity; serve server-side preview thumbnails so users see Pillow output before spending credits.

4. **Credit system race condition** — concurrent "Generate" clicks from the same user can spend 1 credit for 2 generations. Fix: atomic SQL deduction (`UPDATE users SET credits = credits - 1 WHERE id = $1 AND credits > 0 RETURNING credits`), deduct before enqueue (refund on job failure), add Redis distributed lock per user during generation flow.

5. **YooKassa recurring payments require manager approval in production** — subscription auto-renewals are disabled by default in production and require contacting a YooKassa account manager. This is not documented prominently. If not initiated early, subscription auto-renewals silently fail at launch. Fix: contact YooKassa during Phase 1, not Phase 5.

## Implications for Roadmap

Based on research, the architecture's dependency chain is clear and suggests 6 phases:

### Phase 1: Infrastructure Foundation
**Rationale:** All other phases depend on this. Establishing Docker Compose with resource limits is not optional — rembg memory spikes without limits will take down the shared VPS and all other hosted projects. Auth is required by every subsequent API endpoint.
**Delivers:** 7-service Docker Compose running locally and on VPS; PostgreSQL schema + Alembic migrations; MinIO buckets with lifecycle policies; FastAPI project structure with JWT auth + email verification; React SPA scaffold with routing; Nginx reverse proxy with TLS; user registration + login.
**Addresses:** Auth (email/password, JWT), basic user model, credits model, email verification
**Avoids:** rembg memory leak (Docker limits from day one), shared VPS resource starvation (CPU/memory limits per container), file upload security (validation pipeline defined), decompression bomb DoS (Pillow pixel limit set)

### Phase 2: Upload Pipeline and Background Removal
**Rationale:** Background removal is the core "magic moment" — the first thing every user experiences. Must be solid before building the canvas editor on top of it. Surfacing rembg quality issues on real product photos early avoids painful rework later.
**Delivers:** Presigned PUT upload flow (React uploads directly to MinIO); upload confirmation and metadata storage in PostgreSQL; RQ worker with rembg (birefnet-general + alpha matting); job status polling endpoint; React upload-to-result UI with animated progress states.
**Uses:** rembg + Redis RQ + MinIO presigned URLs (ARCHITECTURE.md Pattern 1 and 2)
**Avoids:** Synchronous processing in request handler, cold start delays (pre-bake model in Dockerfile + pre-warm on worker startup), rembg quality failures (alpha matting + birefnet-general default)

### Phase 3: Template System and Canvas Editor
**Rationale:** Template library depth is the make-or-break launch factor. Canvas editor depends on both bg-removed images (Phase 2) and templates. This phase requires the most non-engineering work — template creation runs as a parallel workstream starting in Phase 1. A Pillow rendering spike belongs here, before committing to the full rendering pipeline.
**Delivers:** Template JSON schema (fabric.js-compatible + Pillow-renderable); 50+ templates across 10 niches; template CRUD API; fabric.js canvas editor (load template, place bg-removed image, edit text, toggle badges, undo/redo, layer ordering); multiple slides per project; infographic elements library (100+ badges/icons in SVG).
**Uses:** fabric.js v7.2 (pinned), structured JSON template format (ARCHITECTURE.md Pattern 3), 15-20 bundled Cyrillic fonts tested for Pillow parity
**Avoids:** fabric.js v5/v6 API confusion (pin v7.2), mobile canvas lag (responsive canvas, renderOnAddRemove: false), rendering mismatch (template-zone-constrained editor from the start)

### Phase 4: Rendering, Export, and Dashboard
**Rationale:** Pillow rendering pipeline is the riskiest technical component — a spike in Phase 3 validates the approach, Phase 4 completes it. Export and dashboard complete the core user journey (upload → edit → download → return).
**Delivers:** Canvas JSON-to-Pillow rendering pipeline; multi-format export (WB 900x1200, Ozon 1200x1200, YM 800x800 with safe-zone overlays); server-side watermark for free tier (never expose clean image to free users); presigned GET download URLs; dashboard with card history (grid view, re-edit, bulk download, search/filter); configurable marketplace export presets stored in database (not hardcoded).
**Avoids:** Watermark bypass (server-side only), marketplace requirement changes rendering templates obsolete (data-driven export sizes), pixel-perfect promise failure (server-side preview thumbnails before credits are spent)

### Phase 5: Payments, Credits, and Monetization
**Rationale:** Payments are the business. Credit system correctness must be established before accepting real money. YooKassa manager approval for recurring payments has unknown lead time — initiate contact during Phase 1, complete integration in Phase 5.
**Delivers:** YooKassa integration (subscriptions + one-time 49 rub/card); webhook handler with idempotency (processed_webhooks table with unique constraint on payment_id); atomic credit deduction (SQL-level, before enqueue); subscription plans (Starter 499/mo, Business 990/mo unlimited); free tier enforcement (3 cards/month + watermark); paywall UI; payment reconciliation background job (catches missed webhooks every 5 minutes).
**Avoids:** Credit race condition (atomic SQL + Redis user lock), webhook double-processing (idempotency + immediate 200 + async processing), recurring payment production failure (manager pre-approval secured), free tier multi-account abuse (disposable email blocking + IP rate limits on registration)

### Phase 6: Landing Page, Polish, and Production Launch
**Rationale:** Core product works. Now convert visitors and harden for production traffic.
**Delivers:** Landing page (hero with before/after demo, 3-step flow, pricing table, FAQ, CTA); production hardening (TLS via certbot, PostgreSQL backup cron, health checks on all containers, worker memory monitoring); mobile responsiveness polish; error handling and edge case coverage.
**Avoids:** Mobile editor lag (fabric.js responsive canvas finalized), no public launch without: server-side watermark enforcement confirmed, 50+ templates loaded, YooKassa recurring approval secured

### Phase Ordering Rationale

- Infrastructure first — resource limits protect the shared VPS before any image processing runs; auth is required by all subsequent endpoints
- Upload + BG removal before editor — the canvas editor's primary input is a bg-removed image; cannot build or test the editor without real processed images
- Template creation is a parallel non-engineering workstream — starts in Phase 1 (schema design), asset creation during Phases 1-2, assembled in Phase 3; a designer working in parallel with engineering is the highest-leverage use of time
- Pillow rendering spike in Phase 3 — validate that constrained template layouts translate cleanly from fabric.js JSON to Pillow output before the full Phase 4 rendering pipeline is built
- Payments start early (YooKassa account registration + manager contact in Phase 1), complete in Phase 5 — unknown lead time on recurring payment approval is the forcing function
- Landing page last — build a working product, then convert visitors

### Research Flags

Phases likely needing `/gsd:research-phase` deeper research during planning:
- **Phase 3 (Template System):** Figma-to-fabric.js JSON workflow for template creation is not standardized; research export pipeline and template JSON schema design before finalizing the data model
- **Phase 5 (Payments):** YooKassa 54-FZ fiscal receipt requirements are Russian-law-specific; verify whether YooKassa's built-in receipt API is sufficient or whether a separate OFD (fiscal data operator) integration is required
- **Phase 6 (Production):** Ozon Visual Trust Score (introduced Feb 2026, score below 65 triggers recommendation suppression) — verify current scoring criteria and ensure templates meet the threshold

Phases with standard patterns (skip research-phase):
- **Phase 1 (Infrastructure):** Docker Compose + FastAPI + PostgreSQL + Redis is extremely well-documented; all patterns are established
- **Phase 2 (Upload + BG Removal):** rembg + presigned URL + RQ polling is a standard pattern with multiple verified implementations
- **Phase 4 (Rendering + Export):** Pillow image composition for fixed-layout templates is deterministic and well-documented
- **Phase 6 (Landing Page):** Standard SaaS landing with TailwindCSS; no research needed

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions verified against current PyPI/npm releases as of 2026-03-30. Version compatibility matrix confirmed. Developer has prior experience with FastAPI + React from MasterPlatform and Signal Digest AI. |
| Features | HIGH | 12+ competitors analyzed with pricing verified from live sites. Marketplace image requirements confirmed from official WB/Ozon sources. Template quantity gap identified and quantified. |
| Architecture | HIGH | Presigned URL + RQ + Pillow pattern is the canonical approach for this domain, documented across multiple independent sources. 7-service Docker Compose is standard for single-VPS image SaaS. |
| Pitfalls | HIGH | rembg memory leak verified via GitHub issues #752/#289 and ONNX Runtime issues. Rendering mismatch confirmed via fabric.js issue tracker. Credit race condition is a well-documented distributed systems pattern. YooKassa production quirks verified via official docs. |

**Overall confidence:** HIGH

### Gaps to Address

- **VPS resource headroom:** The shared VPS (64.188.115.254) runs MasterPlatform + Signal Digest AI + the new MarketFoto stack. With rembg workers needing 2GB RAM each (x2 replicas = 4GB for workers alone), total available RAM must be verified before Phase 1 Docker resource limits are set.
- **Pillow-fabric.js font parity:** Which of the 15-20 candidate Cyrillic fonts render identically enough in both Pillow/FreeType and browser canvas must be tested empirically during the Phase 3 spike — cannot be assumed.
- **Template creation pipeline:** How to produce 50+ high-quality Russian marketplace templates efficiently (Figma-to-JSON workflow, designer brief, quality bar definition) needs a concrete plan before Phase 3 begins. Start sourcing during Phase 1.
- **YooKassa recurring payment approval timeline:** Lead time is undocumented. Initiate contact immediately when the YooKassa merchant account is created, not when payments are being coded.
- **MinIO Community Edition maintenance status:** Entered maintenance-only mode October 2025; no security patches going forward. Use Chainguard's maintained image (`cgr.dev/chainguard/minio:latest`) or document the accepted risk.
- **Ozon Visual Trust Score criteria:** The February 2026 scoring system is not fully specified in publicly available sources. Verify current criteria and validate template designs meet the >65 threshold before launch.
- **Font licensing for bundled Cyrillic fonts:** Montserrat, Inter, Roboto are OFL (open-source). Any additional Cyrillic-optimized fonts bundled into Docker image need license verification (commercial use, redistribution rights).

## Sources

### Primary (HIGH confidence)
- [FastAPI releases](https://github.com/fastapi/fastapi/releases) — v0.135.x confirmed, Pydantic v2 requirement
- [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8) — Rolldown-powered, 2026-03-12 release
- [rembg GitHub](https://github.com/danielgatis/rembg) — birefnet-general model support; memory leak issues #752, #289
- [fabric.js npm](https://www.npmjs.com/package/fabric) — v7.2.0 confirmed, serialization API
- [MinIO presigned upload docs](https://min.io/docs/minio/linux/integrations/presigned-put-upload-via-browser.html) — presigned PUT upload pattern
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) — upload security layers
- [WBCard pricing tiers](https://wbcard.ru/plan/) — competitor pricing verified
- [Flyvi pricing](https://flyvi.io/ru/tariffs) — competitor pricing verified
- [YooKassa webhook docs](https://yookassa.ru/developers/using-api/webhooks) — webhook reliability and retry behavior
- [YooKassa recurring payments](https://yookassa.ru/en/developers/payment-acceptance/scenario-extensions/recurring-payments) — production approval requirement
- [Docker resource constraints docs](https://docs.docker.com/reference/compose-file/deploy/) — memory/CPU limit syntax
- [WB/Ozon photo requirements](https://reklama.tochka.com/blog/razmer-foto-dlya-kartochek-tovara-wildberries-i-ozon-trebovaniya) — confirmed export sizes
- [Habr — WB API card upload](https://habr.com/ru/articles/897548/) — direct marketplace upload potential
- [RQ exceptions and retry docs](https://python-rq.org/docs/exceptions/) — job timeout and retry configuration
- [ONNX Runtime memory leak #12207](https://github.com/microsoft/onnxruntime/issues/12207) — root cause of rembg memory issue

### Secondary (MEDIUM confidence)
- [vc.ru — Top 10 AI services for marketplace cards 2026](https://vc.ru/services/1989270-top-10-ai-servisov-dlya-sozdaniya-kartochek-tovarov) — competitor landscape
- [BiRefNet vs rembg vs U2Net production comparison](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-4830) — model quality benchmarks
- [Ozon Image Specs 2026](https://www.alibaba.com/product-insights/ozon-image-size-specs-2026-optimize-your-listings.html) — Ozon Visual Trust Score introduction
- [MinIO maintenance mode analysis](https://www.eloqdata.com/blog/2025/12/10/minio-maintenance) — CE maintenance-only since Oct 2025
- [FastAPI + RQ async job processing](https://medium.com/@akintolaolamilekan51/asynchronous-job-processing-using-redis-queue-and-fastapi-c4ae97272a46) — queue integration pattern
- [fabric.js font rendering Issue #1971](https://github.com/fabricjs/fabric.js/issues/1971) — rendering mismatch evidence
- [Race condition in financial systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions) — credit deduction atomic pattern
- [Free tier abuse prevention](https://trueguard.io/blog/what-is-free-tier-abuse-and-how-saas-can-prevent-it) — disposable email and IP rate limiting strategies
- [Marpla A/B testing for marketplace photos](https://marpla.ru/ab_test_foto/) — Phase 3+ differentiator reference

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
