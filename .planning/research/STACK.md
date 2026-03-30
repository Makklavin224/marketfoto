# Stack Research

**Domain:** Marketplace product card generation SaaS (Russian market)
**Researched:** 2026-03-30
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Python | 3.12 | Runtime | Stable, full onnxruntime/Pillow/rembg support. 3.13 has passlib breakage; 3.12 is safer for this stack. |
| FastAPI | ~0.135 | API framework | Async-native, automatic OpenAPI docs, file upload support via python-multipart, developer experience. Active release cadence (multiple releases/month). |
| Uvicorn | ~0.42 | ASGI server | Lightning-fast ASGI server, standard FastAPI companion. Use `uvicorn[standard]` for uvloop/httptools. |
| React | 19.x | Frontend UI | Stable, concurrent features, developer already experienced. |
| Vite | 8.x | Build tool | Released 2026-03-12. Rolldown-powered (Rust), 10-30x faster builds than Vite 6. Use `@vitejs/plugin-react` v6 (Oxc-based, no Babel dependency). |
| TailwindCSS | 4.2 | Styling | CSS-first config (no tailwind.config.js needed), oklch colors, container queries built-in. Production-ready since early 2025. |
| PostgreSQL | 16 | Primary database | JSONB for template metadata, full-text search for Russian, proven reliability. |
| Redis | 7.x | Queue broker + cache | Required by RQ. Also use for session cache, rate limiting, temporary URL tokens. |
| MinIO | latest | Object storage | S3-compatible API, self-hosted, zero cloud costs. Perfect for VPS deployment. |
| Docker Compose | v2 | Orchestration | 7 services (backend, worker, frontend, postgres, redis, minio, nginx). Standard for VPS single-node. |

### Backend Libraries

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| rembg | latest (~2.0.73) | Background removal | Open-source, supports multiple models including birefnet-general (SOTA quality). Install with `rembg[cpu]`. Use `birefnet-general` model for product photos -- significantly better edge quality than default u2net. |
| Pillow | ~12.1 | Image processing | Server-side rendering guarantees consistent output across browsers. Text rendering, compositing, watermarks, resize/export. |
| pycairo | ~1.29 | Vector/text rendering | Superior text rendering and vector graphics compared to Pillow alone. Use for infographic overlays, badges, curved text. |
| rq (Redis Queue) | ~2.7 | Task queue | Simple, lightweight, sufficient for single-worker MVP. Background removal takes 2-5s -- must be async. |
| SQLAlchemy | ~2.0.48 | ORM | Async support via `sqlalchemy[asyncio]`. Alembic integration for migrations. Pydantic model serialization. |
| Alembic | ~1.18 | DB migrations | Auto-generate migrations from SQLAlchemy models. Standard for FastAPI+SQLAlchemy projects. |
| asyncpg | latest | PostgreSQL driver | 5x faster than psycopg3 for simple queries. Binary protocol. Use with SQLAlchemy async engine. |
| Pydantic | ~2.12 | Data validation | Already bundled with FastAPI. Use for request/response models, settings management (`pydantic-settings`). |
| PyJWT | latest | JWT tokens | Actively maintained (last release 2026-03-13). FastAPI docs moved from python-jose to PyJWT. Do NOT use python-jose (abandoned since 2021). |
| pwdlib[argon2] | latest | Password hashing | Modern replacement for passlib (which breaks on Python 3.13). FastAPI docs now recommend pwdlib. Argon2 is OWASP #1 recommendation. |
| python-multipart | ~0.0.22 | File uploads | Required by FastAPI for `UploadFile`. Handles multipart form data streaming. |
| minio | ~7.2.20 | MinIO SDK | S3-compatible Python client. Upload/download/presigned URLs. |
| httpx | ~0.28 | HTTP client | Async HTTP client for external API calls (YooKassa webhooks verification, future integrations). |
| yookassa | ~3.10 | Payment SDK | Official YooKassa Python SDK. Handles payment creation, webhook parsing, refunds. |
| pydantic-settings | latest | Config management | Environment-based configuration. `.env` file support. Type-safe settings. |

### Frontend Libraries

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| fabric.js | ~7.2 | Canvas editor | Mature interactive canvas library. Drag-and-drop, resize, text editing, image manipulation, serialization to JSON. Active development (updated 2026-03-25). |
| @tanstack/react-query | ~5.95 | Server state | Handles API calls with caching, deduplication, loading/error states. 20% smaller than v4. Suspense support. |
| zustand | ~5.0 | Client state | 3KB, minimal boilerplate. Perfect for canvas editor state, UI state. No Redux overhead needed for a small team. |
| react-router | ~7.13 | Routing | SPA routing for dashboard, editor, landing pages. v7 is stable with active security patches. |
| react-hook-form | ~7.72 | Forms | Registration, login, payment forms. Performant (uncontrolled components), small bundle. |
| zod | latest | Schema validation | TypeScript-first validation. Use with react-hook-form via `@hookform/resolvers`. Shared validation logic. |
| axios | latest | HTTP client | API calls to backend. Interceptors for JWT token refresh. |
| react-dropzone | latest | File upload UX | Drag-and-drop file upload zone. Handles validation (size, type) client-side. |
| react-hot-toast | latest | Notifications | Lightweight toast notifications. Better UX than alert(). |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Ruff | Python linter + formatter | Replaces flake8+black+isort. 100x faster (Rust). Single tool for all Python code quality. |
| pytest | Testing | Standard Python test framework. Use with `pytest-asyncio` for async tests. |
| ESLint + Prettier | JS linting + formatting | Standard for React projects. Use flat config (eslint.config.js). |
| Docker Compose | Local dev environment | Mirror production. `docker compose up` starts all 7 services. |
| Nginx | Reverse proxy | SSL termination, static file serving, rate limiting, proxy to Uvicorn. |

## Installation

### Backend (Python)

```bash
# Core
pip install "fastapi[standard]" uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic

# Image processing
pip install "rembg[cpu]" Pillow pycairo

# Queue
pip install rq redis

# Auth & security
pip install PyJWT "pwdlib[argon2]"

# Storage & payments
pip install minio yookassa

# Utils
pip install httpx python-multipart pydantic-settings

# Dev
pip install ruff pytest pytest-asyncio
```

### Frontend (Node.js)

```bash
# Core
npm install react react-dom fabric

# Routing & state
npm install react-router zustand @tanstack/react-query

# Forms & validation
npm install react-hook-form @hookform/resolvers zod

# UI utilities
npm install axios react-dropzone react-hot-toast

# Dev
npm install -D vite @vitejs/plugin-react tailwindcss typescript @types/react @types/react-dom eslint prettier
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| RQ | Celery | When you need complex task routing, retries with backoff, periodic scheduling, or multiple brokers. RQ is 10x simpler for single-queue background jobs. |
| RQ | ARQ | When your entire app is asyncio-native. ARQ is async-first but has lower throughput in benchmarks and smaller ecosystem. |
| Zustand | Redux Toolkit | When team grows to 5+ developers, or when you need RTK Query's built-in API caching. For solo/small team, Zustand's simplicity wins. |
| asyncpg | psycopg3 | When you need LISTEN/NOTIFY, copy protocol, or prefer a unified sync/async API. asyncpg is faster for simple CRUD. |
| fabric.js | Konva.js | When you need pure React integration (react-konva). fabric.js has richer serialization and more battle-tested text editing. |
| PyJWT | python-jose | Never. python-jose is abandoned since 2021 with known security issues. |
| pwdlib | passlib | Only if you need legacy hash algorithm support. passlib breaks on Python 3.13. |
| Vite 8 | Vite 6 | Never for new projects. Vite 6/7 are EOL. Vite 8 is current stable with Rolldown. |
| birefnet-general | u2net (rembg default) | When processing speed matters more than quality, or on very limited hardware. u2net is faster but worse on edges/hair. |
| Pillow | Wand (ImageMagick) | When you need advanced effects (blur, distortion, SVG rendering). Pillow is simpler and sufficient for card generation. |
| Nginx | Traefik | When you want automatic Docker service discovery and Let's Encrypt. Nginx is more battle-tested and gives finer control for custom rate limiting. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| python-jose | Abandoned since 2021, security vulnerabilities, incompatible with Python 3.12+ | PyJWT |
| passlib | Unmaintained, breaks on Python 3.13 | pwdlib[argon2] |
| Celery (for MVP) | Massive overkill for single-queue background removal. Complex setup, heavy dependencies | RQ |
| Redux | Excessive boilerplate for a small team. Over-engineered for this project scope | Zustand |
| Create React App | Deprecated, no longer maintained. Extremely slow builds | Vite 8 |
| Flask | No async support, no auto-docs, no native type validation | FastAPI |
| Django | Monolithic, slower, unnecessary ORM overhead when you have SQLAlchemy | FastAPI |
| Pillow alone (no pycairo) | Pillow's text rendering is basic -- no kerning control, no vector paths, no curved text | Pillow + pycairo for text/vectors |
| fabricjs-react wrapper | Thin wrapper with potential version lag. Direct fabric.js integration via useRef is simpler and more reliable | Direct fabric.js with React useRef/useEffect |
| S3 (AWS) | Monthly costs, latency from Russian VPS, unnecessary dependency on external service | MinIO (self-hosted, S3-compatible) |
| MongoDB | Relational data (users, subscriptions, credits, templates) fits PostgreSQL perfectly. JSONB handles semi-structured template data. | PostgreSQL with JSONB |

## Stack Patterns

**For background removal pipeline:**
- Use RQ worker as separate Docker service (not in-process)
- Pre-download rembg models at Docker build time (not runtime)
- Use `birefnet-general` model by default, fall back to `u2net` if VRAM/RAM constrained
- Process flow: upload -> store in MinIO -> enqueue RQ job -> worker removes bg -> store result in MinIO -> notify via polling/SSE

**For canvas editor:**
- Use fabric.js directly (not through React wrapper)
- Initialize canvas in useEffect, manage via useRef
- Serialize canvas state as JSON (fabric.js built-in) for save/load
- Final render: send fabric JSON to backend, render with Pillow+pycairo for pixel-perfect output

**For payments (YooKassa):**
- Use official yookassa SDK for payment creation
- Verify webhook signatures (IP whitelist + idempotency keys)
- Store payment status in PostgreSQL, use Redis for idempotency dedup
- Support both subscriptions (recurring) and one-time payments

**For Docker Compose production:**
- Nginx as sole exposed service (ports 80/443)
- Backend containers on internal Docker network only
- Use named volumes for PostgreSQL data, MinIO storage
- Health checks on all services
- Let's Encrypt via certbot sidecar or acme.sh

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| FastAPI ~0.135 | Pydantic ~2.12, Python 3.12 | FastAPI requires Pydantic v2. Verify Pydantic v2 models (not v1 syntax). |
| SQLAlchemy ~2.0 | asyncpg, Alembic ~1.18 | Install `sqlalchemy[asyncio]` for async engine. asyncpg is the recommended async PG driver. |
| rembg latest | Python 3.12, onnxruntime | onnxruntime determines Python version ceiling. Python 3.12 is safe. |
| Vite 8 | @vitejs/plugin-react v6, React 19 | v6 plugin uses Oxc (no Babel). Rolldown replaces esbuild+rollup. |
| TailwindCSS 4.2 | Vite 8 | CSS-first config. No tailwind.config.js needed. @import "tailwindcss" in CSS. |
| fabric.js 7.x | React 19 | No native React bindings -- use via useRef. Works with any React version. |
| RQ ~2.7 | Redis >= 5, Valkey >= 7.2 | Redis 7.x recommended for streams and ACL support. |
| yookassa ~3.10 | Python 3.7-3.12 | Verify Python 3.12 compatibility (declared support goes to 3.12). |

## Model Selection: rembg

| Model | Quality | Speed (CPU) | RAM | Best For |
|-------|---------|-------------|-----|----------|
| u2net | Good | ~2-3s | ~300MB | Simple product shots, white backgrounds |
| birefnet-general | Excellent | ~4-6s | ~1.5GB | Complex edges, transparent objects, professional quality |
| bria-rmbg | Very Good | ~3-5s | ~800MB | Good balance, commercial-friendly license |

**Recommendation:** Start with `birefnet-general` for quality. If VPS RAM is constrained (<4GB), fall back to `u2net`. Pre-download models in Dockerfile to avoid cold-start delays.

## Sources

- [FastAPI releases](https://github.com/fastapi/fastapi/releases) -- version 0.135.x confirmed (HIGH confidence)
- [Vite 8.0 announcement](https://vite.dev/blog/announcing-vite8) -- Rolldown-powered, released 2026-03-12 (HIGH confidence)
- [rembg GitHub](https://github.com/danielgatis/rembg) -- birefnet-general model support confirmed (HIGH confidence)
- [BiRefNet vs rembg vs U2Net comparison](https://dev.to/om_prakash_3311f8a4576605/birefnet-vs-rembg-vs-u2net-which-background-removal-model-actually-works-in-production-4830) -- quality benchmarks (MEDIUM confidence)
- [fabric.js npm](https://www.npmjs.com/package/fabric) -- v7.2.0 confirmed (HIGH confidence)
- [RQ PyPI](https://pypi.org/project/rq/) -- v2.7.0 confirmed (HIGH confidence)
- [YooKassa SDK PyPI](https://pypi.org/project/yookassa/) -- v3.10.0 confirmed (HIGH confidence)
- [Pillow PyPI](https://pypi.org/project/pillow/) -- v12.1.1 confirmed (HIGH confidence)
- [pycairo PyPI](https://pypi.org/project/pycairo/) -- v1.29.0 confirmed (HIGH confidence)
- [MinIO Python SDK PyPI](https://pypi.org/project/minio/) -- v7.2.20 confirmed (HIGH confidence)
- [pwdlib GitHub](https://github.com/frankie567/pwdlib) -- FastAPI docs updated to use pwdlib (HIGH confidence)
- [FastAPI JWT discussion](https://github.com/fastapi/fastapi/discussions/9587) -- python-jose deprecated in favor of PyJWT (HIGH confidence)
- [SQLAlchemy PyPI](https://pypi.org/project/SQLAlchemy/) -- v2.0.48 confirmed (HIGH confidence)
- [TailwindCSS 4.2](https://github.com/tailwindlabs/tailwindcss/releases) -- v4.2.2 confirmed (HIGH confidence)
- [Zustand npm](https://www.npmjs.com/package/zustand) -- v5.0.12 confirmed (HIGH confidence)
- [TanStack React Query npm](https://www.npmjs.com/package/@tanstack/react-query) -- v5.95.0 confirmed (HIGH confidence)
- [Pydantic PyPI](https://pypi.org/project/pydantic/) -- v2.12.5 stable confirmed (HIGH confidence)
- [React Router npm](https://www.npmjs.com/package/react-router) -- v7.13.x confirmed (HIGH confidence)

---
*Stack research for: MarketFoto -- marketplace product card generation SaaS*
*Researched: 2026-03-30*
