# Domain Pitfalls

**Domain:** Marketplace product card generation SaaS (image processing + canvas editor + payments)
**Researched:** 2026-03-30
**Confidence:** HIGH (verified across GitHub issues, official docs, community reports)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, service outages, or fundamental business problems.

---

### Pitfall 1: rembg Memory Leak Kills the Worker (and the VPS)

**What goes wrong:** rembg v2.0.50+ has a documented memory leak in server/sustained-load mode. Memory usage climbs steadily -- one report showed consumption growing to 137GB over hours of sustained processing. On a shared VPS with other services, the OOM killer will terminate the rembg worker and potentially other containers (PostgreSQL, Redis, the API itself).

**Why it happens:** The ONNX Runtime inference session retains memory between runs -- it caches tensor shape information to accelerate repeated calls, but this cache grows unbounded. Additionally, `pymatting` (used for alpha matting) uses `numba` JIT compilation with `@njit` decorators, creating cached compilations that consume memory. Each call to `remove()` without session reuse initializes a new ONNX session (~260MB), and these are not always properly freed by Python's garbage collector.

**Consequences:**
- Worker process OOM-killed mid-job, user gets no result
- PostgreSQL or Redis killed by OOM killer, corrupting data
- Entire VPS becomes unresponsive, affecting other hosted projects (MasterPlatform, Signal Digest AI)
- Credit deducted but no image delivered = angry customer + refund complexity

**Prevention:**
1. **Pre-initialize and reuse the ONNX session** -- create `rembg_session = new_session("u2net")` once at worker startup, pass it to every `remove()` call. Never let `remove()` create a session per call.
2. **Set Docker memory limits** -- `deploy.resources.limits.memory: 2G` for the worker container. Let Docker kill the worker, not the host.
3. **Implement worker recycling** -- restart the RQ worker process after every N jobs (e.g., 50-100 images). RQ's `Worker` (forking mode) helps since each job runs in a subprocess, but the parent still accumulates session memory.
4. **Monitor memory** -- add a simple `/health` endpoint or cron that checks worker RSS. Alert if > 1.5GB.
5. **Never use `SimpleWorker`** in production -- always use the forking `Worker` that isolates each job in a subprocess.

**Detection (warning signs):**
- Worker container memory usage climbs over hours without dropping
- Jobs start failing with "Killed" or exit code 137
- Other containers on the same VPS restart unexpectedly

**Phase to address:** Phase 1 (Infrastructure) -- must be correct from day one. A memory leak on a shared VPS is an existential threat to all hosted services.

**Source confidence:** HIGH -- verified via [GitHub Issue #752](https://github.com/danielgatis/rembg/issues/752), [Issue #289](https://github.com/danielgatis/rembg/issues/289), [ONNX Runtime Issue #12207](https://github.com/microsoft/onnxruntime/issues/12207)

---

### Pitfall 2: Frontend-Backend Rendering Mismatch ("What I See Is NOT What I Get")

**What goes wrong:** The user designs a card in fabric.js on the frontend (drag text, position image, choose font), then clicks "Export." The backend renders the final card with Pillow. The result looks different -- text is positioned wrong, font rendering differs, spacing is off, colors shift. The user loses trust instantly.

**Why it happens:** fabric.js renders via HTML5 Canvas (using the browser's text shaping engine, subpixel antialiasing, platform-specific font metrics). Pillow renders via FreeType (a completely different text rasterizer with different kerning, hinting, and antialiasing). The same font at the same size produces measurably different glyph widths, line heights, and letter spacing between browser Canvas and Pillow/FreeType. This gap is especially noticeable with Cyrillic text (Russian marketplace sellers) and decorative fonts.

**Consequences:**
- Text overflows its bounding box or appears smaller than expected
- Badge text misaligned relative to badge background
- Users re-export multiple times, burning credits and patience
- Support tickets: "the exported image doesn't match what I designed"

**Prevention:**
1. **The canvas editor is for layout; Pillow is for rendering. Accept and communicate this.** Show a "preview" watermark on canvas, make the Pillow render the "real" version.
2. **Use a minimal set of bundled fonts** (5-8 fonts that you control). Load identical .ttf/.otf files in both fabric.js and Pillow. Test rendering parity for each font before adding it to the library.
3. **Snap text to template zones** rather than allowing pixel-perfect free positioning. This hides minor rendering differences behind structured layouts.
4. **Render preview thumbnails server-side** (low-res Pillow render) so users see what they'll actually get before spending credits.
5. **Alternative approach (if mismatch is unacceptable):** Use headless Chromium (Playwright/Puppeteer) for server-side rendering instead of Pillow -- same engine as the browser, pixel-perfect match. But this adds ~200MB to Docker image and is slower.

**Detection (warning signs):**
- QA reveals text position drift > 2px between canvas preview and exported image
- Users re-export the same card multiple times
- Support tickets about "wrong" exports

**Phase to address:** Phase 2 (Template System + Canvas Editor) -- this must be tested and solved before users start editing. The template design should account for rendering differences from the start.

**Source confidence:** HIGH -- verified via [fabric.js server-side rendering discussion](https://github.com/radiolondra/Server-side-FabricJs-using-Puppeteer), [fabric.js font rendering Issue #1971](https://github.com/fabricjs/fabric.js/issues/1971), [Pillow text rendering docs](https://deepwiki.com/python-pillow/Pillow/2.4-drawing-and-font-support)

---

### Pitfall 3: Credit System Race Condition -- Users Get Free Generations

**What goes wrong:** User has 1 credit left. They open two browser tabs, click "Generate" in both simultaneously. Both requests check `credits > 0` (true for both), both proceed to generate, both deduct 1 credit. Result: 2 generations for 1 credit. At scale, bots exploit this systematically.

**Why it happens:** The "check balance then deduct" pattern is not atomic. With Redis RQ, the credit check happens in the API handler (request 1 reads `credits=1`), the job is enqueued, and the deduction happens later. Between check and deduction, request 2 also reads `credits=1`.

**Consequences:**
- Revenue leakage -- power users learn to multi-tab
- Free tier abuse at scale (3 free credits become 6-9)
- Credit balance goes negative, breaking display logic
- Impossible to reconcile credit usage with actual generations

**Prevention:**
1. **Atomic credit deduction** -- use PostgreSQL `UPDATE users SET credits = credits - 1 WHERE id = $1 AND credits > 0 RETURNING credits` as a single atomic operation. If `RETURNING` returns no rows, credits were insufficient.
2. **Deduct BEFORE enqueuing the job**, not after completion. If the job fails, refund the credit.
3. **Redis distributed lock per user** for the generation flow: `SETNX user:{id}:generating 1 EX 60`. Reject concurrent generation requests from the same user.
4. **Idempotency key** on the generation endpoint -- same key = same result, no double-deduction.

**Detection (warning signs):**
- Credit balances going negative in the database
- Generation count > credit deduction count in logs
- Burst of requests from single user within milliseconds

**Phase to address:** Phase 1 (Backend API) for the atomic deduction pattern, reinforced in Phase 3 (Payments/Credits) with full lock implementation.

**Source confidence:** HIGH -- well-documented pattern, verified via [race condition in financial systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions), [billing race condition case study](https://medium.com/@krishnachaitanya.win111/solving-race-condition-how-one-line-of-code-saved-our-billing-system-664ee24a671d)

---

### Pitfall 4: Marketplace Image Requirements Change -- Templates Become Obsolete

**What goes wrong:** You hardcode export sizes (WB: 900x1200, Ozon: 1200x1200, YM: 800x800) and template layouts. Ozon introduces a "Visual Trust Score" in February 2026 that penalizes certain styles. WB changes minimum resolution requirements. Yandex.Market adds new aspect ratio support. Your templates produce images that get rejected or deprioritized by the marketplace.

**Why it happens:** Russian marketplaces update their image requirements frequently and without much warning. Ozon's new Visual Trust Score assigns each SKU a score based on image consistency, background uniformity, and absence of watermarks -- a score below 65 triggers automatic recommendation suppression. WB has been tightening moderation. These platforms evolve their algorithms and requirements quarterly.

**Consequences:**
- Users' cards get rejected by marketplace moderation
- Users blame your tool, not the marketplace
- "MarketFoto cards don't work on Ozon anymore" -- reputation killer
- Emergency patches to templates/sizes under time pressure

**Prevention:**
1. **Make export sizes configurable, not hardcoded.** Store marketplace presets in a database or config file, not in code. Admin panel to update presets without deployment.
2. **Track marketplace changelogs** -- subscribe to Ozon seller API updates, WB seller news. Add a recurring task to check requirements monthly.
3. **Design templates as data** (JSON/DB records with positioning rules), not as hardcoded Pillow rendering logic. Adding a new size or aspect ratio should be a data change, not a code change.
4. **Add a "Custom Size" export option** so users can adapt even before you update presets.
5. **Communicate marketplace requirements** in the UI -- show tooltips like "Ozon requires white background for main image" so users make compliant choices.

**Detection (warning signs):**
- Users report their cards being rejected by marketplace moderation
- Marketplace announces new image guidelines
- Competitors add new export sizes you don't have

**Phase to address:** Phase 2 (Template System) -- make the architecture flexible from the start. Phase 3+ (ongoing) -- monitoring and updating.

**Source confidence:** MEDIUM -- based on [Ozon image specs 2026](https://www.alibaba.com/product-insights/ozon-image-size-specs-2026-optimize-your-listings.html), [marketplace requirements overview](https://reklama.tochka.com/blog/razmer-foto-dlya-kartochek-tovara-wildberries-i-ozon-trebovaniya), [Ozon Visual Trust Score report](https://smartbuy.alibaba.com/tips/ozon-image-sizes). Requirements change frequently; verify current specs at launch.

---

### Pitfall 5: rembg Quality Failures on Real Product Photos

**What goes wrong:** rembg (U2Net model) works great on demo images with clean backgrounds. Real product photos from phone cameras have: cluttered backgrounds, shadows, reflective surfaces, transparent packaging, fur/fabric textures, similar-colored product-and-background. rembg produces: white halos around edges, partially cut objects, blurry edge transitions, missed transparent parts.

**Why it happens:** U2Net is a general-purpose salient object detection model, not specifically trained on e-commerce product photos. It struggles with: (a) transparent or translucent objects (glass bottles, clear packaging), (b) products that blend with background colors, (c) fine details like fabric texture or jewelry chains, (d) multiple products in one photo.

**Consequences:**
- Users upload real photos, get bad cutouts, conclude the tool is useless
- First impression destroys conversion -- "the AI doesn't work"
- Support burden: "why does it cut off part of my product?"
- Users compare to Photoroom ($9.99/mo) which uses more sophisticated models and find MarketFoto worse

**Prevention:**
1. **Use alpha matting** -- always pass `alpha_matting=True` to `remove()` for better edge quality. This uses `pymatting` for edge refinement. It's slower (~2x) but significantly better on edges.
2. **Offer model selection** -- rembg supports multiple models (u2net, u2net_human_seg, isnet-general-use, birefnet). Test BiRefNet specifically -- it's newer and handles edges better. Let users retry with a different model if the first result is poor.
3. **Add manual edge refinement** -- a simple "refine edges" brush in the canvas editor where users can include/exclude areas. This turns a failure into a "good enough with 10 seconds of editing."
4. **Show before/after preview** before deducting credits. Let users reject bad removals without losing credits.
5. **Set expectations in marketing** -- "works best with product photos on simple backgrounds." Don't promise magic on any photo.
6. **Pre-process input images** -- auto-enhance contrast and brightness before passing to rembg. Better input = better segmentation.

**Detection (warning signs):**
- High rate of re-uploads (user uploads same image multiple times, trying different crops)
- Low conversion from "background removed" to "card exported" (users abandon after seeing bad removal)
- Negative reviews mentioning quality

**Phase to address:** Phase 1 (Core Processing) for alpha matting and model selection. Phase 2+ for manual refinement tools.

**Source confidence:** HIGH -- verified via [rembg quality Issue #172](https://github.com/danielgatis/rembg/issues/172), [transparent areas Issue #716](https://github.com/danielgatis/rembg/issues/716), [rembg vs Cloud API comparison](https://ai-engine.net/blog/rembg-vs-cloud-background-removal-api)

---

## Moderate Pitfalls

---

### Pitfall 6: Cold Start and Model Loading Delay

**What goes wrong:** First request after deployment (or worker restart) takes 15-30 seconds instead of 2-5 seconds. The U2Net ONNX model (~176MB) needs to load into memory, and `pymatting`/`numba` needs to JIT-compile functions. Users think the service is broken.

**Why it happens:** ONNX model is loaded lazily on first `remove()` call. Numba's `@njit` decorators compile on first invocation. If the model isn't baked into the Docker image, it downloads from the internet on first use (~176MB download).

**Prevention:**
1. **Pre-download the model in Dockerfile** -- `RUN python -c "from rembg import new_session; new_session('u2net')"` during build. This bakes the model into the image (~3GB image instead of ~1GB, but no runtime download).
2. **Pre-warm the worker** -- on startup, process a dummy 100x100 white image to trigger model loading and numba compilation before accepting real jobs.
3. **Set `NUMBA_CACHE_DIR`** to a persistent volume so numba compilations survive container restarts.
4. **Set `U2NET_HOME`** to a known directory and mount it as a Docker volume for model persistence.

**Detection (warning signs):**
- First job after deployment takes 10x longer than subsequent jobs
- Worker logs show model download on startup

**Phase to address:** Phase 1 (Infrastructure/Docker) -- include in Dockerfile and worker startup script.

**Source confidence:** HIGH -- verified via [rembg Docker PR #742](https://github.com/danielgatis/rembg/pull/742), [rembg Issue #404](https://github.com/danielgatis/rembg/issues/404)

---

### Pitfall 7: Shared VPS Resource Contention

**What goes wrong:** MarketFoto runs on the same VPS (64.188.115.254) as MasterPlatform and Signal Digest AI. rembg is CPU-intensive (2-5 sec per image at 100% CPU on one core). During peak load, background removal starves the other projects' containers of CPU and memory. Or vice versa -- another project's spike crashes MarketFoto.

**Why it happens:** Docker Compose without explicit resource limits gives all containers equal access to host resources. ONNX inference on CPU is single-threaded but very intensive. Multiple concurrent image processing jobs can saturate all CPU cores.

**Prevention:**
1. **Set CPU limits per container** in docker-compose.yml:
   - rembg worker: `cpus: '2.0'` (max 2 cores)
   - API server: `cpus: '1.0'`
   - Other services: `cpus: '0.5'`
2. **Set memory limits** -- worker: 2GB, API: 512MB, PostgreSQL: 512MB, Redis: 256MB, MinIO: 256MB
3. **Limit RQ concurrency** -- run only 1-2 worker processes (not unlimited). Queue excess jobs rather than processing all simultaneously.
4. **Monitor VPS-wide resource usage** -- a simple cron script that checks CPU/memory and alerts if consistently > 80%.
5. **Plan for dedicated VPS** when processing volume exceeds ~100 images/day consistently.

**Detection (warning signs):**
- Processing times gradually increase over weeks
- Other hosted projects become slow during MarketFoto usage spikes
- `docker stats` shows containers hitting CPU/memory limits

**Phase to address:** Phase 1 (Infrastructure) -- configure limits in initial docker-compose.yml.

**Source confidence:** HIGH -- standard Docker operations, verified via [Docker resource constraints docs](https://docs.docker.com/engine/containers/resource_constraints/)

---

### Pitfall 8: File Upload Security Vulnerabilities

**What goes wrong:** Accepting "image uploads" without proper validation allows: malicious files disguised as images (polyglot JPEG with embedded code), oversized uploads causing memory exhaustion (DoS), path traversal in filenames, and SSRF if processing URLs.

**Why it happens:** Checking only the Content-Type header or file extension is trivially bypassable -- the client controls both. Common bypasses: double extensions (shell.php.jpg), null byte injection, EXIF metadata containing scripts, specially crafted images that crash Pillow's decoder (CVE history exists).

**Prevention:**
1. **Validate magic bytes** -- use `python-magic` to check actual file type from first bytes, not the Content-Type header or extension.
2. **Enforce strict size limits** -- 10MB max (as specified in PROJECT.md). Reject before reading the full upload into memory: `request.stream` with byte counting, not `await request.body()`.
3. **Re-encode all uploads** -- open with Pillow, convert to RGB, save as new JPEG/PNG. This strips EXIF metadata, embedded scripts, and malformed chunks. If Pillow can't open it, reject it.
4. **Generate filenames server-side** -- UUID-based names, never use the original filename for storage. Store originals in MinIO with a content-disposition header for download.
5. **Limit image dimensions** -- reject images larger than 8000x8000 pixels. Pillow decompression bombs can consume gigabytes of RAM from a small file (e.g., a 100KB PNG that decompresses to 10000x10000 RGBA = 400MB RAM). Set `PIL.Image.MAX_IMAGE_PIXELS` to a reasonable limit.

**Detection (warning signs):**
- Upload processing crashes with unexpected errors
- Large memory spikes on upload (before rembg even runs)
- Files in MinIO with unexpected extensions or sizes

**Phase to address:** Phase 1 (Backend API) -- upload validation is foundational security.

**Source confidence:** HIGH -- verified via [FastAPI file upload security guide](https://betterstack.com/community/guides/scaling-python/uploading-files-using-fastapi/), [PortSwigger file upload vulnerabilities](https://portswigger.net/web-security/file-upload)

---

### Pitfall 9: YooKassa Webhook Reliability and Recurring Payment Gotchas

**What goes wrong:** Three separate failure modes: (a) Webhook delivery fails, you miss payment confirmations, users pay but get no credits. (b) Recurring payments silently stop working because they require explicit YooKassa manager approval for production (not just test mode). (c) Webhook handler is slow, YooKassa retries, you process the same payment twice.

**Why it happens:**
- YooKassa retries webhooks for 24 hours if the response is not HTTP 200. If your handler throws an exception before responding, the same webhook fires repeatedly.
- Recurring payments (autopayments) are enabled by default only in the demo store. Production requires contacting a YooKassa manager to enable them -- this is not documented prominently.
- Without idempotency, processing the same webhook twice doubles credits or creates duplicate subscriptions.

**Prevention:**
1. **Respond 200 immediately**, process the webhook in background (enqueue to Redis RQ). This prevents timeouts and retries.
2. **Implement idempotency** -- store `payment_id` in a `processed_webhooks` table with a unique constraint. If insert fails (duplicate), skip processing.
3. **Contact YooKassa manager BEFORE launch** to enable recurring payments in production. Test with real cards in test mode (without 3-D Secure, as 3DS blocks autopayments in test).
4. **Implement webhook signature verification** -- validate the webhook actually came from YooKassa, not an attacker.
5. **Build a payment reconciliation job** -- periodically check payment status via YooKassa API to catch any missed webhooks. Run every 5 minutes, check recent pending payments.

**Detection (warning signs):**
- Users report paying but not receiving credits/subscription
- Duplicate credit additions in logs
- Recurring payment creation works in test but fails in production

**Phase to address:** Phase 3 (Payments) -- get this right before accepting real money.

**Source confidence:** HIGH -- verified via [YooKassa webhook docs](https://yookassa.ru/developers/using-api/webhooks), [YooKassa recurring payments docs](https://yookassa.ru/en/developers/payment-acceptance/scenario-extensions/recurring-payments)

---

### Pitfall 10: Watermark Bypass on Free Plan

**What goes wrong:** The watermark is supposed to enforce paid conversion. But if watermarking happens client-side (fabric.js adds it to the canvas), users can: (a) inspect the canvas and remove the watermark element before export, (b) screenshot the canvas without watermark, (c) intercept API responses containing the unwatermarked image. If the API returns the clean image and the client adds the watermark, the clean image is exposed.

**Why it happens:** Any security measure enforced client-side can be bypassed by a technically savvy user. Developer tools, network interception, and canvas manipulation are trivial.

**Prevention:**
1. **Watermark on the server, never the client.** The Pillow render endpoint for free-plan users must composite the watermark into the final image. The unwatermarked image should never be sent to the client or stored in an accessible location.
2. **Watermark in the storage layer** -- free plan images in MinIO should only exist in watermarked form. No "original" accessible to the user.
3. **Use semi-transparent diagonal watermarks** that cross the product area (not just a corner logo that can be cropped). Tile the watermark across the image.
4. **Don't serve original uploads** back to free users without watermark. Even the background-removed preview should have a watermark overlay.

**Detection (warning signs):**
- Unwatermarked images appearing with free-plan user IDs in access logs
- Network tab showing raw image URLs that bypass watermark
- Users sharing high-quality images without upgrading

**Phase to address:** Phase 1 (Core Processing) for server-side watermark architecture, Phase 3 (Payments) for enforcement logic.

**Source confidence:** MEDIUM -- general SaaS pattern, verified via [watermark security guide](https://ones.com/blog/knowledge/watermark-security-features-protect-digital-assets/)

---

### Pitfall 11: Free Tier Abuse via Multiple Accounts

**What goes wrong:** Users create multiple email accounts to get 3 free credits each month. Disposable email services (tempmail, guerrillamail) make this trivial. A single person can generate unlimited free cards, destroying the conversion funnel to paid plans.

**Why it happens:** Email-only registration has near-zero friction for creating multiple accounts. Without device fingerprinting or phone verification, there's no way to link accounts to a real person.

**Prevention:**
1. **Block disposable email domains** -- maintain a blocklist of known tempmail domains (npm packages and Python libraries exist for this). Reject registration from these domains.
2. **Rate limit by IP** -- max 2 account registrations per IP per day. Won't stop VPN users but catches casual abuse.
3. **Delay free credit availability** -- don't give credits instantly on registration. Require email verification first (already planned via JWT, but verify the email is real).
4. **Track device fingerprint** (optional, Phase 2+) -- browser fingerprinting to detect same device creating multiple accounts.
5. **Make free tier valuable but limited enough** -- 3 credits/month with watermark is already a good balance. Don't increase free credits.
6. **Accept some leakage** -- perfect prevention is impossible and hurts UX. Focus on making paid plans compelling, not on blocking every free user.

**Detection (warning signs):**
- Spike in registrations from the same IP range
- Many accounts that use exactly 3 credits and never return
- Registration surge from disposable email domains

**Phase to address:** Phase 1 (Auth) for email verification and disposable domain blocking. Phase 2+ for advanced fingerprinting.

**Source confidence:** HIGH -- verified via [free tier abuse prevention](https://trueguard.io/blog/what-is-free-tier-abuse-and-how-saas-can-prevent-it), [SaaS trial abuse prevention](https://www.istempmail.com/articles/how-to-prevent-free-trial-abuse-for-saas-ai/)

---

## Minor Pitfalls

---

### Pitfall 12: fabric.js Version Confusion (v5 vs v6/v7)

**What goes wrong:** Most tutorials and Stack Overflow answers reference fabric.js v5. Version 6 rewrote the library in TypeScript with significant breaking changes (method renames, group system rewrite, callbacks replaced with promises). Version 7 adds canvas v3 and node 20 support. Mixing v5 examples with v6/v7 code produces cryptic errors.

**Prevention:** Pin fabric.js to a specific version (v6.x recommended for new projects). Use only the [official v6 migration guide](https://fabricjs.com/docs/upgrading/upgrading-to-fabric-60/) and current docs. Remove `@types/fabric` if using v6+ (TypeScript types are built-in).

**Phase to address:** Phase 2 (Frontend/Canvas Editor).

---

### Pitfall 13: MinIO Community Edition Entering Maintenance Mode

**What goes wrong:** As of October 2025, MinIO Community Edition entered maintenance-only status. Docker Hub and Quay images are no longer updated. For MVP on a single VPS this is fine, but it means no security patches or new features going forward.

**Prevention:** Use `cgr.dev/chainguard/minio:latest` (Chainguard's maintained image) instead of the official MinIO Docker image. Or simply accept the risk for MVP -- MinIO CE works fine for small-scale storage; revisit when scaling.

**Phase to address:** Phase 1 (Infrastructure) -- choose the right Docker image.

**Source confidence:** MEDIUM -- verified via [MinIO maintenance announcement analysis](https://www.eloqdata.com/blog/2025/12/10/minio-maintenance)

---

### Pitfall 14: Pillow Decompression Bomb DoS

**What goes wrong:** A maliciously crafted image file (small on disk, enormous when decompressed) can consume gigabytes of RAM when Pillow opens it. Example: a 100KB PNG that decompresses to 50000x50000 RGBA = 10GB RAM.

**Prevention:** Set `PIL.Image.MAX_IMAGE_PIXELS = 89_478_485` (default, but verify it's not disabled). Add explicit dimension checks after `Image.open()` but before any processing. Reject images > 8000x8000 pixels.

**Phase to address:** Phase 1 (Backend API/Upload validation).

---

### Pitfall 15: fabric.js Performance on Mobile Devices

**What goes wrong:** Marketplace sellers often work from phones. fabric.js performance degrades significantly on mobile browsers with large canvas sizes (1200x1200+) and multiple objects. Dragging becomes laggy, text editing stutters, the canvas may crash on low-end Android devices.

**Prevention:** Implement responsive canvas that scales down for editing on mobile (edit at 600x600, export at full resolution). Set `renderOnAddRemove: false` and batch re-renders. Limit the number of objects per canvas. Consider a simplified mobile editor (template-only, no free positioning).

**Phase to address:** Phase 2 (Canvas Editor) -- test on real mobile devices early.

**Source confidence:** HIGH -- verified via [fabric.js performance issues](https://github.com/fabricjs/fabric.js/issues/1855), [Android canvas performance Issue #5319](https://github.com/fabricjs/fabric.js/issues/5319)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Infrastructure | rembg memory leak crashes VPS | Docker memory limits + worker recycling + session reuse |
| Phase 1: Infrastructure | Shared VPS resource starvation | CPU/memory limits per container in docker-compose.yml |
| Phase 1: Backend API | Credit race condition | Atomic SQL deduction before enqueue |
| Phase 1: Backend API | File upload security | Magic byte validation + re-encoding + dimension limits |
| Phase 1: Core Processing | Cold start delays | Pre-bake model in Docker image + pre-warm worker |
| Phase 1: Core Processing | rembg quality on real photos | Alpha matting + model selection + edge refinement UX |
| Phase 2: Templates | Marketplace requirement changes | Data-driven templates + configurable export sizes |
| Phase 2: Canvas Editor | fabric.js version confusion | Pin v6.x, use only current docs |
| Phase 2: Canvas Editor | Frontend-backend render mismatch | Controlled font set + template zones + server preview |
| Phase 2: Canvas Editor | Mobile performance | Responsive canvas + rendering optimizations |
| Phase 3: Payments | YooKassa webhook double-processing | Idempotency keys + immediate 200 + async processing |
| Phase 3: Payments | Recurring payments fail in production | Contact YooKassa manager before launch |
| Phase 3: Payments | Free tier abuse | Disposable email blocking + IP rate limits |
| Phase 3: Payments | Watermark bypass | Server-side watermark only, never send clean image to client |

---

## Competitor Intelligence: What They Do That You Might Miss

| Competitor Feature | Why It Matters | Your Risk If Missing |
|---|---|---|
| Photoroom: batch editing (apply same settings to 50+ images) | Sellers have 50-500 SKUs, editing one-by-one is painful | Users churn after first 10 cards despite loving the tool |
| Photoroom: AI background generation (not just removal) | Plain white/gradient backgrounds are table stakes now | Your output looks "2020" compared to AI-generated lifestyle backgrounds |
| Pixelcut: mobile-first editing | 60%+ of small WB sellers work from phones | Desktop-only editor misses the majority of your target market |
| wbcard.ru / wondercard.ru: Russian-specific infographic templates | WB/Ozon have specific infographic styles (icons, badges, comparison tables) | Generic templates feel foreign to RU marketplace sellers |

---

## Sources

- [rembg Memory Leak Issue #752](https://github.com/danielgatis/rembg/issues/752)
- [rembg Concurrent Memory Leak Issue #289](https://github.com/danielgatis/rembg/issues/289)
- [ONNX Runtime Memory Release Issue #12207](https://github.com/microsoft/onnxruntime/issues/12207)
- [ONNX Runtime Memory Leak Issue #22271](https://github.com/microsoft/onnxruntime/issues/22271)
- [rembg Docker Model PR #742](https://github.com/danielgatis/rembg/pull/742)
- [rembg Quality Issue #172](https://github.com/danielgatis/rembg/issues/172)
- [rembg Transparent Areas Issue #716](https://github.com/danielgatis/rembg/issues/716)
- [rembg Session Reuse (DeepWiki)](https://deepwiki.com/danielgatis/rembg/4.2-session-and-model-management)
- [rembg vs Cloud API Comparison](https://ai-engine.net/blog/rembg-vs-cloud-background-removal-api)
- [fabric.js Performance Issues](https://github.com/fabricjs/fabric.js/issues/1855)
- [fabric.js Optimizing Performance Wiki](https://github.com/fabricjs/fabric.js/wiki/Optimizing-performance)
- [fabric.js v6 Breaking Changes](https://github.com/fabricjs/fabric.js/issues/8299)
- [fabric.js Font Rendering Issue #1971](https://github.com/fabricjs/fabric.js/issues/1971)
- [fabric.js Server-side Rendering with Puppeteer](https://github.com/radiolondra/Server-side-FabricJs-using-Puppeteer)
- [YooKassa Webhook Documentation](https://yookassa.ru/developers/using-api/webhooks)
- [YooKassa Recurring Payments](https://yookassa.ru/en/developers/payment-acceptance/scenario-extensions/recurring-payments)
- [Docker Resource Constraints](https://docs.docker.com/engine/containers/resource_constraints/)
- [MinIO Maintenance Mode Analysis](https://www.eloqdata.com/blog/2025/12/10/minio-maintenance)
- [FastAPI Secure File Uploads](https://betterstack.com/community/guides/scaling-python/uploading-files-using-fastapi/)
- [File Upload Vulnerabilities (PortSwigger)](https://portswigger.net/web-security/file-upload)
- [Race Conditions in Financial Systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions)
- [Free Tier Abuse Prevention](https://trueguard.io/blog/what-is-free-tier-abuse-and-how-saas-can-prevent-it)
- [Ozon Image Requirements 2026](https://www.alibaba.com/product-insights/ozon-image-size-specs-2026-optimize-your-listings.html)
- [Marketplace Image Requirements (RU)](https://reklama.tochka.com/blog/razmer-foto-dlya-kartochek-tovara-wildberries-i-ozon-trebovaniya)
- [Pillow Text Rendering (DeepWiki)](https://deepwiki.com/python-pillow/Pillow/2.4-drawing-and-font-support)
- [Photoroom vs Pixelcut Comparison](https://www.photoroom.com/blog/photoroom-vs-pixelcut)
