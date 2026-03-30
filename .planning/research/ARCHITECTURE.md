# Architecture Patterns

**Domain:** Image processing SaaS -- marketplace product card generator
**Researched:** 2026-03-30

## Recommended Architecture

MarketFoto's proposed architecture (7 Docker Compose services) is sound for an MVP on a single VPS. The core pattern -- API gateway + async worker queue + object storage -- is the standard approach for image processing SaaS. Below is a validated and refined version.

### High-Level System Diagram

```
                    [Browser / React SPA]
                           |
                      [Nginx :80/443]
                       /          \
              /api/*             /*  (static files)
                |                    |
         [FastAPI :8000]      [Vite build / static]
           /    |    \
     [PostgreSQL] [Redis] [MinIO S3]
                    |
              [RQ Worker]
                    |
               [MinIO S3]
```

### Component Boundaries

| Component | Responsibility | Communicates With | Port |
|-----------|---------------|-------------------|------|
| **Nginx** | Reverse proxy, TLS termination, static file serving, upload size limits | FastAPI, static files | 80, 443 |
| **React SPA** | Canvas editor (fabric.js), upload UI, dashboard, auth forms | FastAPI (REST), MinIO (presigned PUT) | - |
| **FastAPI API** | Auth (JWT), image metadata, template CRUD, payment webhooks, job enqueue, presigned URL generation | PostgreSQL, Redis, MinIO | 8000 |
| **RQ Worker** | Background removal (rembg), final card rendering (Pillow), image resizing for export | Redis (job queue), MinIO (read/write images) | - |
| **PostgreSQL** | Users, images metadata, templates metadata, renders, payments, credits | FastAPI (via asyncpg/SQLAlchemy) | 5432 |
| **Redis** | Job queue (RQ), job status/progress, session cache, rate limiting | FastAPI, RQ Worker | 6379 |
| **MinIO** | Object storage for originals, processed (bg removed), rendered cards | FastAPI (presigned URLs), RQ Worker (direct), React (presigned PUT) | 9000, 9001 |

### Data Flow

#### Flow 1: Image Upload + Background Removal

```
1. React → POST /api/images/upload-url (filename, content_type, size)
2. FastAPI validates → generates presigned PUT URL from MinIO → returns URL + image_id
3. React → PUT directly to MinIO presigned URL (originals/{user_id}/{image_id}.jpg)
4. React → POST /api/images/{image_id}/confirm (confirms upload complete)
5. FastAPI → validates file exists in MinIO → enqueues RQ job "remove_background"
6. FastAPI → returns { image_id, status: "processing", job_id }
7. RQ Worker picks up job → downloads from MinIO originals/ → runs rembg → uploads to MinIO processed/
8. RQ Worker → updates job status in Redis → updates image record in PostgreSQL
9. React polls GET /api/images/{image_id}/status OR receives WebSocket update
10. React → fetches processed image via presigned GET URL for canvas editing
```

**Why presigned URLs for upload:** Offloads bandwidth from FastAPI. The API server never touches raw image bytes during upload. On a single VPS this matters less, but it is the correct pattern that scales if needed and keeps the API server's memory clean.

#### Flow 2: Template Selection + Canvas Editing

```
1. React → GET /api/templates (list available templates with metadata)
2. FastAPI → returns template list (id, name, thumbnail_url, category, canvas_json)
3. React loads template canvas_json into fabric.js canvas
4. React loads processed image (bg removed) onto canvas
5. User edits: repositions image, adds text, badges, adjusts layout
6. Canvas state lives entirely client-side (fabric.js objects)
```

**Key decision:** Templates are stored as JSON (fabric.js serialization format) in PostgreSQL, not as image files. This allows the canvas editor to reconstruct them exactly and users to modify every element.

#### Flow 3: Final Render + Export

```
1. User clicks "Export" → React serializes canvas via fabric.js toJSON()
2. React → POST /api/renders/create { image_id, template_id, canvas_json, export_formats: ["wb", "ozon", "ym"] }
3. FastAPI validates → enqueues RQ job "render_card"
4. RQ Worker picks up job → reconstructs composition from canvas_json using Pillow
5. RQ Worker → renders at each target size: WB 900x1200, Ozon 1200x1200, YM 800x800
6. RQ Worker → applies watermark if free plan → uploads all variants to MinIO rendered/
7. RQ Worker → updates render record in PostgreSQL with URLs
8. React polls status → receives download URLs → user downloads
```

#### Flow 4: Payment + Credit System

```
1. React → POST /api/payments/create { plan: "starter" }
2. FastAPI → creates YooKassa payment → returns confirmation_url
3. User completes payment on YooKassa
4. YooKassa → POST /api/webhooks/yookassa (webhook)
5. FastAPI → verifies webhook signature → updates user plan/credits → returns 200
6. Idempotency: payment_id stored, duplicate webhooks ignored
```

## Critical Architectural Decision: Rendering Strategy

This is the most consequential architectural choice in the project. There are three approaches:

### Option A: Pure Pillow Server-Side Render (Proposed)
**How:** Canvas JSON is sent to backend, Python code uses Pillow to manually compose the image (paste layers, draw text, position badges).

**Pros:**
- Single language (Python) for all backend work
- No additional dependencies (no Node.js, no headless browser)
- Guaranteed deterministic output
- Easy watermarking
- Low resource usage

**Cons:**
- Must manually reimplement every fabric.js feature in Pillow (text wrapping, font rendering, transforms, filters, shadows)
- Visual fidelity gap: what user sees in canvas editor will NOT match Pillow output pixel-for-pixel
- Text rendering differences (browser fonts vs Pillow fonts) are the biggest pain point
- Increasing feature complexity in the editor means increasing Pillow rendering complexity

### Option B: Headless Browser Render (Puppeteer/Playwright)
**How:** Send canvas JSON to a Node.js service running headless Chromium, load fabric.js, render to PNG.

**Pros:**
- Pixel-perfect match with what user sees in editor
- No reimplementation of fabric.js features
- Industry-standard approach for canvas-to-image

**Cons:**
- Adds Node.js dependency to stack
- Headless Chromium is heavy (~400MB RAM per instance)
- On a single VPS, resource-constrained

### Option C: Hybrid -- Pillow for Templates, Client Export for Custom (RECOMMENDED)
**How:** Use a dual strategy:
- **Template-based cards:** Templates are designed with known, fixed layouts. Pillow renders them because the composition is predictable (fixed text positions, known badge placements, defined image regions). The canvas editor constrains user edits to template-safe operations (move/scale image, edit text content, toggle badges).
- **Client-side export fallback:** `canvas.toDataURL('image/png')` exports the canvas as-is for edge cases where Pillow rendering would be complex.

**Pros:**
- No new dependencies beyond current stack
- Templates are predictable enough for Pillow to render accurately
- Client export provides escape hatch
- Watermark added server-side regardless (overlay on client-exported image)

**Cons:**
- Client-exported PNGs limited to canvas resolution (solvable: set canvas to export resolution)
- Two code paths for rendering
- Client export trusts the browser -- free-tier watermark must still be enforced server-side

**Recommendation:** Start with **Option C** for MVP. Templates have fixed layouts -- Pillow handles this well. Constrain the editor to template-safe operations (which is what the product needs anyway). If the editor grows complex enough to need pixel-perfect server rendering, add Puppeteer later.

For MVP specifically: the editor is simple (move image, edit text, toggle badges). Pillow can handle this. The canvas_json sent to the backend describes a small set of operations that map cleanly to Pillow calls:
- `Image.paste()` for image placement
- `ImageDraw.text()` for text
- `Image.alpha_composite()` for badges/overlays
- `Image.resize()` for export dimensions

## Patterns to Follow

### Pattern 1: Presigned URL Upload
**What:** Client uploads directly to MinIO via presigned PUT URL, bypassing FastAPI.
**When:** All image uploads.
**Why:** Prevents FastAPI from buffering large files in memory. Essential on a constrained VPS.

```python
# FastAPI endpoint
@router.post("/images/upload-url")
async def get_upload_url(req: UploadRequest, user: User = Depends(get_current_user)):
    image_id = uuid4()
    key = f"originals/{user.id}/{image_id}.{req.extension}"
    url = minio_client.presigned_put_object(
        bucket_name="images",
        object_name=key,
        expires=timedelta(minutes=15),
    )
    # Create image record with status="uploading"
    await db.images.create(id=image_id, user_id=user.id, key=key, status="uploading")
    return {"upload_url": url, "image_id": image_id}
```

### Pattern 2: Job Status via Redis + Polling
**What:** RQ worker writes progress to Redis hash; client polls a lightweight status endpoint.
**When:** Background removal and rendering jobs.
**Why:** Simpler than WebSockets for MVP, zero additional infrastructure.

```python
# Worker updates progress
def remove_background(image_id: str):
    redis.hset(f"job:{image_id}", mapping={"status": "processing", "progress": 0})
    # ... process ...
    redis.hset(f"job:{image_id}", mapping={"status": "processing", "progress": 50})
    # ... finish ...
    redis.hset(f"job:{image_id}", mapping={"status": "complete", "progress": 100})

# FastAPI polling endpoint
@router.get("/images/{image_id}/status")
async def get_image_status(image_id: str):
    status = redis.hgetall(f"job:{image_id}")
    return status  # {"status": "processing", "progress": 50}
```

### Pattern 3: Template as Structured JSON
**What:** Store templates as JSON schema describing layers (background, image_slot, text_zones, badges).
**When:** All template definitions.
**Why:** Enables both fabric.js canvas reconstruction (client) and Pillow rendering (server) from the same source of truth.

```python
# Template JSON schema (stored in PostgreSQL jsonb column)
{
    "name": "Infographic WB",
    "canvas_size": {"width": 900, "height": 1200},
    "layers": [
        {"type": "background", "color": "#FFFFFF"},
        {"type": "image_slot", "x": 50, "y": 100, "width": 800, "height": 700, "fit": "contain"},
        {"type": "text", "id": "title", "x": 50, "y": 830, "width": 800, "font_size": 48,
         "font_family": "Montserrat", "color": "#1A1A1A", "default_text": "Название товара"},
        {"type": "text", "id": "feature1", "x": 50, "y": 920, "width": 380, "font_size": 24,
         "color": "#666666", "icon": "checkmark", "default_text": "Особенность 1"},
        {"type": "badge", "id": "discount", "x": 700, "y": 30, "template": "circle_red",
         "default_text": "-20%", "visible": true}
    ]
}
```

### Pattern 4: Bucket Organization with Lifecycle
**What:** Organize MinIO into three buckets with distinct retention policies.
**When:** All image storage.

```
images/
  originals/{user_id}/{image_id}.jpg     # User uploads, keep 30 days
  processed/{user_id}/{image_id}.png     # BG-removed, keep 30 days
  rendered/{user_id}/{render_id}/
    wb_900x1200.jpg                       # Final cards, keep 90 days
    ozon_1200x1200.jpg
    ym_800x800.jpg
```

### Pattern 5: Credit System as Middleware
**What:** Check user credits before enqueueing any processing job.
**When:** Before background removal and rendering.
**Why:** Prevents queuing work that cannot be fulfilled. Credits are atomic (PostgreSQL transaction).

```python
async def require_credits(user: User, amount: int = 1):
    async with db.transaction():
        current = await db.users.get_credits(user.id, for_update=True)
        if current < amount:
            raise HTTPException(402, "Insufficient credits")
        await db.users.deduct_credits(user.id, amount)
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Routing Image Bytes Through FastAPI
**What:** Accepting multipart file upload in FastAPI and forwarding to MinIO.
**Why bad:** FastAPI buffers the entire file in memory. 10MB image x 10 concurrent uploads = 100MB RAM consumed. On a VPS with other services, this causes OOM.
**Instead:** Use presigned PUT URLs. Client uploads directly to MinIO.

### Anti-Pattern 2: Synchronous Image Processing in Request Handler
**What:** Running rembg in the FastAPI request/response cycle.
**Why bad:** rembg takes 2-5 seconds on CPU. This blocks the async event loop (rembg is CPU-bound, not async). Uvicorn workers will be exhausted under load.
**Instead:** Always enqueue to RQ. Return job_id immediately. Client polls for status.

### Anti-Pattern 3: Pixel-Perfect Promise with Pillow Rendering
**What:** Promising users WYSIWYG and rendering with Pillow.
**Why bad:** Font rendering, text wrapping, shadow effects, and transforms will differ between browser canvas and Pillow. Users will report "export looks different from preview."
**Instead:** Constrain the editor to template-safe operations where Pillow can produce matching output. Use fixed font set. Limit text to defined zones with known dimensions.

### Anti-Pattern 4: Storing Images in PostgreSQL
**What:** Using bytea columns for image storage.
**Why bad:** Bloats database, kills backup performance, no CDN compatibility.
**Instead:** MinIO for storage, PostgreSQL stores only metadata (key, size, content_type, status).

### Anti-Pattern 5: Single RQ Worker Without Timeouts
**What:** Running one worker with no job timeout or failure handling.
**Why bad:** A stuck rembg job (large image, corrupted file) blocks all subsequent jobs. Queue backs up.
**Instead:** Set job timeout (60s for bg removal, 30s for rendering). Run 2-3 workers. Configure retry with `Retry(max=2, interval=30)`.

## Scalability Considerations

| Concern | At 100 users/day | At 1K users/day | At 10K users/day |
|---------|-------------------|-----------------|-------------------|
| **Upload bandwidth** | Presigned URLs handle it; Nginx 10MB limit | Same; monitor MinIO disk | Add CDN (Cloudflare) in front of MinIO |
| **BG removal queue** | 1-2 RQ workers sufficient | 3-4 workers; consider GPU | Dedicated GPU worker VPS or switch to API service |
| **Rendering** | Pillow in same workers | Separate render queue from BG removal queue | Dedicated render workers |
| **Storage** | ~10GB/month at 100 imgs/day | ~100GB/month; need lifecycle cleanup | Tiered storage; archive to cold storage |
| **Database** | Single PostgreSQL fine | Add connection pooling (PgBouncer) | Read replica for dashboard queries |
| **API** | 2 Uvicorn workers | 4 workers | Multiple FastAPI instances behind load balancer |

## Build Order (Dependencies)

The architecture has clear dependency chains that determine build order:

```
Phase 1: Foundation (no dependencies)
├── PostgreSQL schema + migrations (Alembic)
├── MinIO buckets + CORS config
├── Redis setup
├── FastAPI project structure + auth (JWT)
└── React project structure + routing

Phase 2: Upload Pipeline (depends on Phase 1)
├── Presigned URL generation endpoint
├── React upload component → MinIO direct upload
├── Upload confirmation endpoint
├── Image metadata in PostgreSQL
└── Basic dashboard (list user images)

Phase 3: Background Removal (depends on Phase 2)
├── RQ worker setup + Docker config
├── rembg integration (birefnet-general model)
├── Job status tracking in Redis
├── Polling endpoint for status
└── React: upload → processing → result flow

Phase 4: Template System (depends on Phase 2, parallel with Phase 3)
├── Template JSON schema design
├── Template CRUD API
├── 5 starter templates created
└── Template listing in React

Phase 5: Canvas Editor (depends on Phase 3 + Phase 4)
├── fabric.js integration in React
├── Load template JSON into canvas
├── Load processed image onto canvas
├── Text editing, badge toggling
└── Canvas state management

Phase 6: Rendering + Export (depends on Phase 5)
├── Canvas JSON → Pillow rendering pipeline
├── Multi-format export (WB, Ozon, YM sizes)
├── Watermark for free tier
├── Download API with presigned GET URLs
└── React export flow + download

Phase 7: Payments + Credits (parallel with Phase 5-6)
├── YooKassa integration
├── Webhook handler with idempotency
├── Credit system (deduct on job enqueue)
├── Subscription plans
└── Paywall UI

Phase 8: Landing + Polish (after Phase 6)
├── Landing page (hero, before/after, pricing, FAQ)
├── Dashboard polish (history, stats)
├── Error handling + edge cases
└── Production deployment (TLS, backups, monitoring)
```

**Critical path:** Phases 1 → 2 → 3 → 5 → 6 form the critical path. Phase 4 (templates) can run in parallel with Phase 3 (bg removal). Phase 7 (payments) can start as early as Phase 5.

**Riskiest phase:** Phase 6 (rendering). The canvas_json-to-Pillow translation is the most uncertain component. Prototype this early -- even a rough spike in Phase 4 -- to validate that Pillow can faithfully reproduce the template layouts.

## Model Selection: rembg Configuration

rembg now natively supports BiRefNet models. Use `birefnet-general` as the default model for product photography. It provides significantly better edge quality than U2Net, especially for:
- Transparent/glass objects (78% accuracy vs 48% for U2Net)
- Complex fabric/clothing (critical for fashion marketplace sellers)
- Hair and fine details

```python
from rembg import remove, new_session

# Create session with BiRefNet model (downloads on first use, ~400MB)
session = new_session("birefnet-general")

# Process image
result = remove(input_image, session=session)
```

**Trade-off:** BiRefNet is ~75% slower than U2Net (1.4s vs 0.8s per image on CPU) but produces far fewer images requiring manual touch-up. For a product where quality is the value proposition, this is the correct choice.

**Model caching:** The model is downloaded once to `~/.u2net/` (400MB). In Docker, mount this as a volume so it persists across container restarts:

```yaml
worker:
  volumes:
    - rembg_models:/root/.u2net
```

## Docker Compose Resource Allocation

On a single VPS (assume 8GB RAM, 4 CPU cores):

```yaml
services:
  nginx:
    deploy:
      resources:
        limits: { cpus: '0.25', memory: 128M }

  frontend:  # Only for dev; production serves static from nginx
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 256M }

  api:
    deploy:
      resources:
        limits: { cpus: '1.0', memory: 512M }

  worker:
    deploy:
      resources:
        limits: { cpus: '2.0', memory: 2G }  # rembg is CPU+memory hungry
      replicas: 2  # Two workers for parallel processing

  postgres:
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 512M }

  redis:
    deploy:
      resources:
        limits: { cpus: '0.25', memory: 256M }

  minio:
    deploy:
      resources:
        limits: { cpus: '0.5', memory: 512M }
```

**Note:** rembg with BiRefNet model consumes ~1.2GB RAM during inference. The 2GB limit per worker is essential to prevent OOM kills. With 2 workers, peak memory for workers alone is 4GB.

## Security Architecture

### Upload Validation (Defense in Depth)

```python
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

# Layer 1: Nginx (client_max_body_size 10m)
# Layer 2: Presigned URL with content-type condition
# Layer 3: On upload confirmation, worker validates:
#   - Magic bytes match declared content type
#   - PIL.Image.open() succeeds (file is valid image)
#   - Dimensions within reasonable bounds (max 8000x8000)
#   - Strip EXIF data (privacy + prevent EXIF exploits)
```

### API Security
- JWT with short expiry (15min access, 7d refresh)
- Rate limiting via Redis (per-user, per-endpoint)
- CORS: only allow marketfoto.ru origin
- YooKassa webhook verification via IP whitelist + signature

## Sources

- [rembg GitHub - models and installation](https://github.com/danielgatis/rembg) -- HIGH confidence
- [BiRefNet vs rembg vs U2Net production comparison](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-4830) -- MEDIUM confidence
- [FastAPI + RQ async job processing](https://medium.com/@akintolaolamilekan51/asynchronous-job-processing-using-redis-queue-and-fastapi-c4ae97272a46) -- MEDIUM confidence
- [FastAPI polling pattern for long-running tasks](https://openillumi.com/en/en-fastapi-long-task-progress-polling/) -- MEDIUM confidence
- [Presigned URL upload with React + FastAPI + S3](https://medium.com/@sanmugamsanjai98/secure-file-uploads-made-simple-mastering-s3-presigned-urls-with-react-and-fastapi-258a8f874e97) -- MEDIUM confidence
- [MinIO presigned upload docs](https://min.io/docs/minio/linux/integrations/presigned-put-upload-via-browser.html) -- HIGH confidence
- [fabric.js serialization (toJSON/loadFromJSON)](https://fabricjs.com/docs/old-docs/fabric-intro-part-3/) -- HIGH confidence
- [Server-side fabric.js rendering with Puppeteer](https://github.com/radiolondra/Server-side-FabricJs-using-Puppeteer) -- MEDIUM confidence
- [Pillow-SIMD for production image processing](https://github.com/uploadcare/pillow-simd) -- HIGH confidence
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html) -- HIGH confidence
- [Docker Compose resource limits](https://docs.docker.com/reference/compose-file/deploy/) -- HIGH confidence
- [RQ retry and exception handling](https://python-rq.org/docs/exceptions/) -- HIGH confidence
- [Photoroom template/batch architecture](https://docs.photoroom.com/image-editing-api-plus-plan/alpha-templating-mode) -- MEDIUM confidence
