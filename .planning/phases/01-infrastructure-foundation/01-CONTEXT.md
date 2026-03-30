# Phase 1: Infrastructure Foundation - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Docker Compose stack with 7 services (backend, worker, frontend, postgres, redis, minio, nginx) that starts with one command. Full DB schema initialized, MinIO buckets configured, health checks passing. This is the foundation for all subsequent phases — no business logic, no UI beyond a health check endpoint.

</domain>

<decisions>
## Implementation Decisions

### Database Migrations
- **D-01:** Use Alembic for schema management. Define SQLAlchemy 2.0 models, auto-generate initial migration from SPECIFICATION.md SQL schema. All future schema changes go through Alembic.

### rembg Model Setup
- **D-02:** Pre-download birefnet-general model at Docker build time (in worker Dockerfile). The model layer (~1.5GB) is baked into the image — no cold start delay on first request.
- **D-03:** Session reuse in worker — create rembg session once at startup, reuse across jobs to avoid memory leak from repeated model loading.

### Worker Configuration
- **D-04:** 1 RQ worker for MVP. Docker memory limit 2GB on worker container. Worker recycling after prolonged use to prevent ONNX memory accumulation.
- **D-05:** Dedicated VPS for MarketFoto: 4GB RAM / 2 vCPU / 50GB SSD. NOT shared with other projects. Upgrade path: 8GB + 2 workers if load grows.

### Development Workflow
- **D-06:** Docker Compose with volume mounts for development. Backend: `./backend/app:/app/app` with `uvicorn --reload`. Frontend: `./frontend/src:/app/src` with Vite HMR. One `docker compose up` starts everything.
- **D-07:** Separate `docker-compose.yml` (production) and `docker-compose.override.yml` (dev overrides: volume mounts, debug ports, hot reload).

### MinIO Access Pattern
- **D-08:** Presigned URLs for both upload and download. Client uploads directly to MinIO via signed PUT URL. Downloads via signed GET URL (1 hour expiry). Backend never proxies file bytes — only generates signed URLs.

### SSL
- **D-09:** Certbot service in Docker Compose for Let's Encrypt auto-renewal. Standard setup as on other projects.

### Claude's Discretion
- Nginx configuration details (proxy headers, buffer sizes, rate limiting)
- Docker network topology (bridge vs custom network)
- PostgreSQL tuning (shared_buffers, work_mem for 4GB VPS)
- Redis configuration (maxmemory policy)
- docker-compose.override.yml structure for dev vs prod

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Specification
- `docs/SPECIFICATION.md` — Full SQL schema (5 tables with CHECK constraints, indexes), Docker Compose definition (7 services), all .env variables, API endpoint contracts
- `docs/PROJECT_IDEA.md` — Architecture diagram, tech stack rationale, module I/O definitions

### Research
- `.planning/research/STACK.md` — Verified library versions (Python 3.12, FastAPI ~0.135, Vite 8, etc.), PyJWT over python-jose, pwdlib over passlib
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, presigned URL pattern
- `.planning/research/PITFALLS.md` — rembg memory leak mitigation (session reuse, Docker limits, worker recycling), MinIO bucket policies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns

### Integration Points
- `docs/` directory contains the full specification and project idea — these are the source of truth for schema, API contracts, and seed data

</code_context>

<specifics>
## Specific Ideas

- VPS is dedicated (not shared with MasterPlatform/Signal Digest AI) — simplifies resource management
- Same Docker Compose approach as prior projects but on its own server
- birefnet-general model chosen over u2net for quality — accept the 1.5GB RAM cost

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-infrastructure-foundation*
*Context gathered: 2026-03-30*
