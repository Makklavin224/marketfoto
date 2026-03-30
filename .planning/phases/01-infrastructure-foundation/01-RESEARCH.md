# Phase 1: Infrastructure Foundation - Research

**Researched:** 2026-03-30
**Domain:** Docker Compose infrastructure, PostgreSQL, Redis, MinIO, FastAPI project scaffolding, Alembic migrations, Nginx reverse proxy
**Confidence:** HIGH

## Summary

Phase 1 establishes the entire development and production infrastructure for MarketFoto as a Docker Compose stack with 7 services. The core challenge is getting all services to start with a single command, correctly wired together with health checks, and ready for subsequent phases to build upon. This is a greenfield project with no existing code -- everything is created from scratch.

The stack is well-defined in STACK.md research and the SPECIFICATION.md. The primary technical risks are: (1) MinIO Community Edition is in maintenance mode since October 2025 and Docker Hub images are discontinued -- use Chainguard's maintained image instead, (2) the rembg worker with birefnet-general model requires ~1.5GB RAM and must be pre-downloaded at Docker build time to avoid cold start delays, and (3) PostgreSQL tuning for a 4GB VPS needs careful shared_buffers/work_mem settings to coexist with other services.

**Primary recommendation:** Build the docker-compose.yml and docker-compose.override.yml pair with explicit health checks on every service, memory limits on every container, and a separate init container for MinIO bucket creation. Use Alembic with async SQLAlchemy 2.0 for schema management from day one.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use Alembic for schema management. Define SQLAlchemy 2.0 models, auto-generate initial migration from SPECIFICATION.md SQL schema. All future schema changes go through Alembic.
- **D-02:** Pre-download birefnet-general model at Docker build time (in worker Dockerfile). The model layer (~1.5GB) is baked into the image -- no cold start delay on first request.
- **D-03:** Session reuse in worker -- create rembg session once at startup, reuse across jobs to avoid memory leak from repeated model loading.
- **D-04:** 1 RQ worker for MVP. Docker memory limit 2GB on worker container. Worker recycling after prolonged use to prevent ONNX memory accumulation.
- **D-05:** Dedicated VPS for MarketFoto: 4GB RAM / 2 vCPU / 50GB SSD. NOT shared with other projects. Upgrade path: 8GB + 2 workers if load grows.
- **D-06:** Docker Compose with volume mounts for development. Backend: `./backend/app:/app/app` with `uvicorn --reload`. Frontend: `./frontend/src:/app/src` with Vite HMR. One `docker compose up` starts everything.
- **D-07:** Separate `docker-compose.yml` (production) and `docker-compose.override.yml` (dev overrides: volume mounts, debug ports, hot reload).
- **D-08:** Presigned URLs for both upload and download. Client uploads directly to MinIO via signed PUT URL. Downloads via signed GET URL (1 hour expiry). Backend never proxies file bytes -- only generates signed URLs.
- **D-09:** Certbot service in Docker Compose for Let's Encrypt auto-renewal. Standard setup as on other projects.

### Claude's Discretion
- Nginx configuration details (proxy headers, buffer sizes, rate limiting)
- Docker network topology (bridge vs custom network)
- PostgreSQL tuning (shared_buffers, work_mem for 4GB VPS)
- Redis configuration (maxmemory policy)
- docker-compose.override.yml structure for dev vs prod

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INFRA-01 | Docker Compose with 7 services starts with one command | Docker Compose v2 with health checks, depends_on conditions, custom network |
| INFRA-02 | MinIO with 3 buckets (originals, processed, rendered) and lifecycle policies | Chainguard MinIO image + mc init container for bucket creation |
| INFRA-03 | PostgreSQL 16 with full SQL schema (users, images, templates, renders, payments) | Alembic initial migration from SQLAlchemy 2.0 models matching SPECIFICATION.md |
| INFRA-04 | Redis available for RQ queue and cache | Redis 7-alpine with maxmemory 256MB + noeviction policy for queue safety |
| INFRA-05 | Nginx reverse proxy routes /api to backend, / to frontend | Nginx alpine with location blocks, SPA catch-all, proxy headers |
| INFRA-06 | Docker memory limits for worker (max 2GB) | deploy.resources.limits on all containers |
| INFRA-07 | .env file with all environment variables | Template .env.example with all vars from SPECIFICATION.md |
| INFRA-08 | Health check endpoint (/api/health) checks all dependencies | FastAPI endpoint with async checks for PostgreSQL, Redis, MinIO |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

The CLAUDE.md file contains the full project context including stack decisions, conventions, and architecture patterns. Key directives relevant to Phase 1:

- **Stack is locked:** Python 3.12 + FastAPI ~0.135 + SQLAlchemy 2.0 + Alembic + asyncpg (backend), React 19 + Vite 8 + TailwindCSS 4 (frontend)
- **Do NOT use:** python-jose (use PyJWT), passlib (use pwdlib), Celery (use RQ), Django/Flask (use FastAPI)
- **Pre-download rembg models at Docker build time** (not runtime)
- **Use `birefnet-general` model** by default
- **Nginx as sole exposed service** (ports 80/443), backend containers on internal Docker network only
- **Named volumes** for PostgreSQL data and MinIO storage
- **Health checks on all services**
- **GSD workflow enforcement** -- do not make direct repo edits outside GSD workflow

## Standard Stack

### Core Infrastructure
| Component | Image / Version | Purpose | Configuration |
|-----------|----------------|---------|---------------|
| Docker Compose | v2 (bundled with Docker Engine) | Service orchestration | 7 services + 1 init container |
| PostgreSQL | `postgres:16-alpine` | Primary database | Custom postgresql.conf for 4GB VPS |
| Redis | `redis:7-alpine` | RQ queue broker + cache | maxmemory 256MB, noeviction |
| MinIO | `cgr.dev/chainguard/minio:latest` | S3-compatible object storage | 3 buckets via mc init container |
| MinIO Client | `quay.io/minio/mc:latest` | Bucket initialization | One-shot init container |
| Nginx | `nginx:alpine` | Reverse proxy, TLS termination | Custom nginx.conf |
| Certbot | `certbot/certbot` | Let's Encrypt SSL | Volume-shared certs with Nginx |

### Backend (Python 3.12)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| FastAPI | ~0.135 | API framework | Locked in STACK.md |
| Uvicorn | ~0.42 | ASGI server | With `uvicorn[standard]` for uvloop |
| SQLAlchemy | ~2.0.48 | ORM with async | `sqlalchemy[asyncio]` for async engine |
| Alembic | ~1.18 | DB migrations | Auto-generate from SQLAlchemy models |
| asyncpg | latest | PostgreSQL async driver | 5x faster than psycopg3 for simple queries |
| Pydantic | ~2.12 | Data validation | Bundled with FastAPI |
| pydantic-settings | latest | Config management | .env file support, type-safe settings |
| rembg | latest (~2.0.73) | Background removal | With `rembg[cpu]`, birefnet-general model |
| rq | ~2.7 | Task queue | Single worker for MVP |
| redis (Python) | latest | Redis client | For health checks and direct Redis ops |
| minio | ~7.2.20 | MinIO Python SDK | Presigned URLs, bucket management |
| Pillow | ~12.1 | Image processing | For health check image validation, later rendering |
| python-multipart | ~0.0.22 | File uploads | Required by FastAPI for UploadFile |

### Frontend (Node.js)
| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| React | 19.x | UI framework | Locked |
| Vite | 8.x | Build tool | Rolldown-powered |
| TailwindCSS | 4.2 | Styling | CSS-first config |

**Note:** Frontend in Phase 1 is minimal -- just a working dev server with a basic page that proves Vite + React + TailwindCSS work inside the Docker container. Full frontend development begins in later phases.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `cgr.dev/chainguard/minio` | `minio/minio` (Docker Hub) | Docker Hub images discontinued Oct 2025, contain unpatched CVEs. Chainguard is free, maintained, CVE-free. |
| `postgres:16-alpine` | `postgres:16` | Alpine is smaller (~80MB vs ~400MB). No functional difference for this use case. |
| Separate mc init container | Python SDK bucket creation in backend startup | Init container is cleaner -- runs once, exits, does not couple bucket creation to application code. |
| `noeviction` Redis policy | `allkeys-lru` | RQ requires keys to persist -- LRU eviction would silently drop queued jobs. Use noeviction for queue safety, accept OOM errors as a signal to investigate. |

## Architecture Patterns

### Recommended Project Structure
```
marketfoto/
├── docker-compose.yml              # Production-ready base config
├── docker-compose.override.yml     # Dev overrides (auto-loaded by docker compose)
├── .env.example                    # Template for all env vars
├── .env                            # Actual env vars (gitignored)
├── nginx/
│   ├── nginx.conf                  # Production config (SSL, proxy)
│   └── nginx.dev.conf              # Dev config (no SSL, proxy)
├── scripts/
│   └── init-minio.sh               # MinIO bucket creation script
├── backend/
│   ├── Dockerfile                  # Multi-stage: builder + runtime
│   ├── requirements.txt            # Pinned Python dependencies
│   ├── alembic.ini                 # Alembic configuration
│   ├── alembic/
│   │   ├── env.py                  # Async migration runner
│   │   └── versions/               # Migration files
│   │       └── 001_initial.py      # Initial schema migration
│   └── app/
│       ├── __init__.py
│       ├── main.py                 # FastAPI app factory
│       ├── config.py               # Pydantic Settings
│       ├── database.py             # Async SQLAlchemy engine + session
│       ├── models/
│       │   ├── __init__.py         # Import all models for Alembic
│       │   ├── base.py             # DeclarativeBase with naming conventions
│       │   ├── user.py             # User model
│       │   ├── image.py            # Image model
│       │   ├── template.py         # Template model
│       │   ├── render.py           # Render model
│       │   └── payment.py          # Payment model
│       └── api/
│           ├── __init__.py
│           └── health.py           # Health check endpoint
├── worker/
│   └── Dockerfile                  # Extends backend + pre-downloads rembg model
├── frontend/
│   ├── Dockerfile                  # Multi-stage: build + nginx serve
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.css                # TailwindCSS 4 entry (CSS-first, no config file)
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       └── App.tsx                 # Minimal "MarketFoto" page
└── docs/
    ├── PROJECT_IDEA.md
    └── SPECIFICATION.md
```

### Pattern 1: Docker Compose with Health-Dependent Startup
**What:** Use `depends_on` with `condition: service_healthy` to enforce correct startup order.
**When:** All service dependencies.
**Example:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: marketfoto
      POSTGRES_USER: marketfoto
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U marketfoto -d marketfoto"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M

  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --maxmemory 256mb
      --maxmemory-policy noeviction
      --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 300M

  minio:
    image: cgr.dev/chainguard/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          memory: 512M

  minio-init:
    image: quay.io/minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: /bin/sh
    command: -c "
      mc alias set myminio http://minio:9000 $${MINIO_USER} $${MINIO_PASSWORD};
      mc mb --ignore-existing myminio/originals;
      mc mb --ignore-existing myminio/processed;
      mc mb --ignore-existing myminio/rendered;
      exit 0;
      "
    environment:
      MINIO_USER: ${MINIO_USER}
      MINIO_PASSWORD: ${MINIO_PASSWORD}

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 512M

  worker:
    build: ./worker
    command: rq worker --url redis://redis:6379 --max-jobs 100
    env_file: .env
    depends_on:
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 2G
    restart: unless-stopped

  frontend:
    build: ./frontend
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 256M

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - certbot-webroot:/var/www/certbot:ro
      - certbot-certs:/etc/letsencrypt:ro
    depends_on:
      backend:
        condition: service_healthy
      frontend:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 128M
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - certbot-webroot:/var/www/certbot
      - certbot-certs:/etc/letsencrypt
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done"

networks:
  default:
    name: marketfoto

volumes:
  pgdata:
  miniodata:
  certbot-webroot:
  certbot-certs:
```

### Pattern 2: Development Override File
**What:** `docker-compose.override.yml` adds volume mounts, debug ports, and hot reload.
**When:** Local development (auto-loaded by `docker compose up`).
**Example:**
```yaml
# docker-compose.override.yml (auto-loaded in development)
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --proxy-headers
    volumes:
      - ./backend/app:/app/app:cached
    ports:
      - "8000:8000"  # Direct access for debugging

  worker:
    volumes:
      - ./backend/app:/app/app:cached

  frontend:
    command: npm run dev -- --host 0.0.0.0 --port 3000
    volumes:
      - ./frontend/src:/app/src:cached
      - ./frontend/index.html:/app/index.html:cached
    ports:
      - "3000:3000"  # Direct Vite HMR access

  postgres:
    ports:
      - "5432:5432"  # Direct DB access for debugging

  redis:
    ports:
      - "6379:6379"  # Direct Redis access for debugging

  minio:
    ports:
      - "9000:9000"  # S3 API
      - "9001:9001"  # MinIO Console

  nginx:
    volumes:
      - ./nginx/nginx.dev.conf:/etc/nginx/nginx.conf:ro

  certbot:
    profiles: ["production"]  # Disabled in development
```

### Pattern 3: Async SQLAlchemy + Alembic Configuration
**What:** Configure Alembic to work with async SQLAlchemy 2.0 and asyncpg.
**When:** Database migrations.
**Example:**
```python
# backend/app/models/base.py
from sqlalchemy.orm import DeclarativeBase, MappedAsDataclass
from sqlalchemy import MetaData

# Naming conventions ensure Alembic generates consistent constraint names
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=convention)
```

```python
# backend/app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.config import settings

# Use asyncpg driver
engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    echo=False,
    pool_size=5,
    max_overflow=10,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)
```

```python
# backend/alembic/env.py (async migration runner)
import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Import all models so Alembic sees them
from app.models import Base  # noqa: F401

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()

def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

### Pattern 4: FastAPI Health Check Endpoint
**What:** Async health check that probes all 3 infrastructure dependencies in parallel.
**When:** `/api/health` endpoint.
**Example:**
```python
# backend/app/api/health.py
import asyncio
from fastapi import APIRouter
from app.database import engine
from sqlalchemy import text
import redis.asyncio as aioredis
from minio import Minio
from app.config import settings

router = APIRouter()

@router.get("/api/health")
async def health_check():
    checks = {}

    # PostgreSQL check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["postgres"] = "connected"
    except Exception as e:
        checks["postgres"] = f"error: {str(e)}"

    # Redis check
    try:
        r = aioredis.from_url(settings.redis_url)
        await r.ping()
        await r.aclose()
        checks["redis"] = "connected"
    except Exception as e:
        checks["redis"] = f"error: {str(e)}"

    # MinIO check
    try:
        client = Minio(
            settings.s3_endpoint.replace("http://", ""),
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            secure=False,
        )
        # list_buckets is a lightweight operation
        buckets = client.list_buckets()
        bucket_names = [b.name for b in buckets]
        checks["minio"] = {
            "status": "connected",
            "buckets": bucket_names,
        }
    except Exception as e:
        checks["minio"] = f"error: {str(e)}"

    all_ok = all(
        (isinstance(v, str) and v == "connected") or
        (isinstance(v, dict) and v.get("status") == "connected")
        for v in checks.values()
    )

    return {
        "status": "healthy" if all_ok else "unhealthy",
        "checks": checks,
    }
```

### Pattern 5: Nginx Configuration for API + SPA
**What:** Route /api/* to FastAPI backend, everything else to frontend SPA with try_files fallback.
**When:** Production and development.
**Example:**
```nginx
# nginx/nginx.conf (production)
events {
    worker_connections 1024;
}

http {
    include mime.types;
    default_type application/octet-stream;
    sendfile on;
    keepalive_timeout 65;
    client_max_body_size 15m;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;
        server_name marketfoto.ru;

        # Certbot challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        # Redirect all HTTP to HTTPS
        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl;
        server_name marketfoto.ru;

        ssl_certificate /etc/letsencrypt/live/marketfoto.ru/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/marketfoto.ru/privkey.pem;

        # API routes
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }

        # Frontend SPA (catch-all)
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;

            # SPA fallback -- try file, then index
            try_files $uri $uri/ /index.html;
        }
    }
}
```

```nginx
# nginx/nginx.dev.conf (development -- no SSL)
events {
    worker_connections 256;
}

http {
    include mime.types;
    default_type application/octet-stream;
    client_max_body_size 15m;

    upstream backend {
        server backend:8000;
    }

    upstream frontend {
        server frontend:3000;
    }

    server {
        listen 80;

        # API routes
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Vite HMR WebSocket
        location /ws {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
        }

        # Frontend SPA (catch-all)
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
        }
    }
}
```

### Pattern 6: Worker Dockerfile with Pre-downloaded Model
**What:** Separate Dockerfile for worker that pre-downloads the birefnet-general model at build time.
**When:** Worker container build.
**Example:**
```dockerfile
# worker/Dockerfile
FROM python:3.12-slim AS base

WORKDIR /app

# Install system dependencies for rembg/onnxruntime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/app ./app

# Pre-download birefnet-general model (~1.5GB baked into image layer)
RUN python -c "from rembg import new_session; new_session('birefnet-general')"

# Pre-warm numba JIT compilation
ENV NUMBA_CACHE_DIR=/tmp/numba_cache
RUN python -c "
from rembg import remove, new_session
from PIL import Image
import io
session = new_session('birefnet-general')
img = Image.new('RGB', (100, 100), 'white')
buf = io.BytesIO()
img.save(buf, 'PNG')
buf.seek(0)
remove(buf.getvalue(), session=session)
print('Model pre-warmed successfully')
"

CMD ["rq", "worker", "--url", "redis://redis:6379", "--max-jobs", "100"]
```

### Anti-Patterns to Avoid
- **Sharing the official `minio/minio` Docker Hub image:** Discontinued since October 2025 with unpatched CVEs. Use `cgr.dev/chainguard/minio:latest` instead.
- **No health checks on services:** Without health checks, `depends_on` only waits for container start, not service readiness. PostgreSQL can take 5-10 seconds to initialize.
- **Exposing all ports in production:** Only Nginx should be exposed (80/443). All other services communicate via the internal Docker network.
- **Using `allkeys-lru` Redis eviction policy with RQ:** RQ stores job data in Redis keys. LRU eviction would silently drop queued jobs. Use `noeviction` and size the maxmemory appropriately.
- **Running Alembic migrations synchronously with asyncpg:** Alembic's `run_sync()` wrapper is required when using async drivers. The env.py must use `async_engine_from_config`.
- **Hardcoding connection strings:** Use environment variables via pydantic-settings. All connection strings come from .env.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service startup ordering | Custom wait-for-it scripts | Docker Compose `depends_on: condition: service_healthy` | Native, no extra scripts, works with all services |
| MinIO bucket creation | Python code in backend startup | mc init container in Docker Compose | Runs once, exits, decoupled from application lifecycle |
| Database schema management | Raw SQL files or manual DDL | Alembic + SQLAlchemy 2.0 models | Auto-generated migrations, rollback support, version tracking |
| Environment configuration | Manual os.environ reads | pydantic-settings with .env support | Type validation, defaults, nested settings, environment override |
| SSL certificate management | Manual certbot runs | Certbot Docker container with auto-renewal loop | Runs every 12 hours, handles renewal automatically |

**Key insight:** This phase is entirely about wiring standard infrastructure components together. Every service has a well-documented Docker configuration pattern. The value is in getting the wiring right (health checks, startup order, resource limits, network isolation), not in inventing new infrastructure patterns.

## Common Pitfalls

### Pitfall 1: MinIO Docker Hub Image Discontinued
**What goes wrong:** `minio/minio` Docker Hub images have not been updated since October 2025. Existing images contain unpatched CVEs including CVE-2025-62506.
**Why it happens:** MinIO Community Edition entered maintenance mode. Docker Hub and Quay images are no longer published.
**How to avoid:** Use `cgr.dev/chainguard/minio:latest` -- free, maintained by Chainguard, CVE-free, built from source.
**Warning signs:** `docker pull minio/minio` pulls stale October 2025 image with vulnerability warnings.

### Pitfall 2: MinIO Health Check Incompatibility with Chainguard Image
**What goes wrong:** The standard MinIO health check `curl -f http://localhost:9000/minio/health/live` may fail on the Chainguard image because `curl` is not included in the minimal image.
**Why it happens:** Chainguard images are minimal -- they remove unnecessary binaries to reduce attack surface.
**How to avoid:** Use `wget` instead of `curl` for health checks, or use the MinIO client (`mc`) for checks. Alternatively, check if the Chainguard image includes `curl` -- if not, use a multi-line healthcheck that relies on the MinIO binary itself or `wget -q --spider`.
**Warning signs:** Health check always fails with "command not found" after switching to Chainguard image.

### Pitfall 3: PostgreSQL shared_buffers Exceeds Docker shm_size
**What goes wrong:** PostgreSQL configured with `shared_buffers=256MB` but Docker gives only 64MB of `/dev/shm` by default. PostgreSQL fails to start with "could not resize shared memory segment" error.
**Why it happens:** Linux Docker containers get 64MB /dev/shm by default. PostgreSQL requires shared_buffers to fit within the shared memory segment.
**How to avoid:** Set `shm_size: '512m'` on the PostgreSQL container in docker-compose.yml. Or use `--shared-memory-size` Docker flag.
**Warning signs:** PostgreSQL container exits immediately after start with shared memory errors.

### Pitfall 4: Alembic Async Driver Connection String
**What goes wrong:** Alembic uses the `sqlalchemy.url` from alembic.ini which contains `postgresql://` (sync). But asyncpg requires `postgresql+asyncpg://`. Migration fails with driver mismatch error.
**Why it happens:** Alembic.ini is read before Python code runs. The async driver prefix must be set programmatically in env.py.
**How to avoid:** In `alembic/env.py`, override the URL from config to swap the driver prefix, or set `sqlalchemy.url` dynamically from pydantic-settings with the correct async prefix. Best practice: read DATABASE_URL from environment in env.py rather than hardcoding in alembic.ini.
**Warning signs:** "No module named 'psycopg2'" or "async driver required" errors during migration.

### Pitfall 5: Worker Container Uses Same Dockerfile as Backend
**What goes wrong:** If worker and backend share the same Dockerfile, the backend image bloats to 3+ GB because it includes the rembg model. Or the worker image lacks the model and downloads it at runtime (cold start).
**Why it happens:** The birefnet-general model is ~1.5GB. Baking it into every container is wasteful; not baking it causes cold starts.
**How to avoid:** Use a separate `worker/Dockerfile` that extends the backend base and adds the model download step. Backend Dockerfile stays lean (~200MB).
**Warning signs:** Backend container is unexpectedly large (3GB+), or first worker job takes 30+ seconds.

### Pitfall 6: Redis noeviction Causes OOM
**What goes wrong:** With `noeviction` policy and 256MB limit, Redis returns OOM errors when memory is full, causing RQ job enqueue failures.
**Why it happens:** RQ jobs and their metadata consume Redis memory. With noeviction, Redis refuses writes instead of evicting keys.
**How to avoid:** Monitor Redis memory usage. Set `maxmemory` high enough for expected job volume (256MB handles thousands of pending jobs). Add TTL to completed job results via RQ config (`result_ttl=3600`). If Redis memory grows unexpectedly, investigate stuck jobs.
**Warning signs:** RQ enqueue calls fail with OOM errors. Jobs stop being processed.

## Code Examples

### Pydantic Settings Configuration
```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Database
    database_url: str = "postgresql://marketfoto:password@postgres:5432/marketfoto"

    # Redis
    redis_url: str = "redis://redis:6379"

    # MinIO
    s3_endpoint: str = "http://minio:9000"
    s3_access_key: str = "marketfoto"
    s3_secret_key: str = "changeme"

    # Auth
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"
    jwt_expires_hours: int = 168

    # YooKassa (placeholder for Phase 8)
    yookassa_shop_id: str = ""
    yookassa_secret_key: str = ""

    # App
    app_url: str = "https://marketfoto.ru"
    cors_origins: str = "https://marketfoto.ru,http://localhost:3000"

settings = Settings()
```

### Backend Dockerfile (Lean)
```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini .
COPY alembic ./alembic

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
```

### FastAPI Application Factory
```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.health import router as health_router

def create_app() -> FastAPI:
    app = FastAPI(
        title="MarketFoto API",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)

    return app

app = create_app()
```

### PostgreSQL Tuning for 4GB VPS
```
# Applied via command in docker-compose.yml postgres service
# postgres:
#   command: >
#     postgres
#     -c shared_buffers=256MB
#     -c effective_cache_size=1GB
#     -c work_mem=4MB
#     -c maintenance_work_mem=128MB
#     -c max_connections=50
#     -c wal_buffers=16MB
#     -c checkpoint_completion_target=0.9
#     -c random_page_cost=1.1
```

**Rationale for 4GB VPS (not 25% rule):** The VPS runs 7 services, not just PostgreSQL. The 25% rule applies to dedicated DB servers. With worker taking 2GB and other services consuming ~1GB, PostgreSQL gets ~512MB container limit. `shared_buffers=256MB` is 50% of its container allocation, which is appropriate.

### .env.example Template
```bash
# Database
DB_PASSWORD=change_me_to_strong_password
DATABASE_URL=postgresql://marketfoto:${DB_PASSWORD}@postgres:5432/marketfoto

# Redis
REDIS_URL=redis://redis:6379

# MinIO / S3
MINIO_USER=marketfoto
MINIO_PASSWORD=change_me_to_strong_password
S3_ENDPOINT=http://minio:9000
S3_ACCESS_KEY=${MINIO_USER}
S3_SECRET_KEY=${MINIO_PASSWORD}

# Auth
JWT_SECRET=change_me_to_random_64_char_string
JWT_ALGORITHM=HS256
JWT_EXPIRES_HOURS=168

# YooKassa (Phase 8 -- set when integrating payments)
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
YOOKASSA_WEBHOOK_SECRET=

# App
APP_URL=https://marketfoto.ru
CORS_ORIGINS=https://marketfoto.ru,http://localhost:3000
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `minio/minio` Docker Hub | `cgr.dev/chainguard/minio:latest` | Oct 2025 | Official images discontinued, use Chainguard free tier |
| passlib for password hashing | pwdlib[argon2] | 2024-2025 | passlib breaks on Python 3.13, FastAPI docs updated |
| python-jose for JWT | PyJWT | 2024 | python-jose abandoned since 2021, security vulnerabilities |
| Vite 6 | Vite 8 | Mar 2026 | Rolldown-powered, 10-30x faster builds |
| TailwindCSS 3 (JS config) | TailwindCSS 4 (CSS-first) | Jan 2025 | No tailwind.config.js needed, `@import "tailwindcss"` |
| Alembic sync-only | Alembic async with SQLAlchemy 2.0 | 2023+ | async_engine_from_config in env.py |

**Deprecated/outdated:**
- `minio/minio` Docker Hub images: Discontinued Oct 2025, contain CVE-2025-62506
- `wait-for-it.sh` scripts: Replaced by Docker Compose native `depends_on: condition: service_healthy`
- Manual SSL: Certbot Docker container handles everything automatically

## Open Questions

1. **Chainguard MinIO image health check commands**
   - What we know: Chainguard images are minimal and may not include curl
   - What's unclear: Whether `wget` or `mc` is available in the Chainguard minio image
   - Recommendation: Test during implementation. If neither is available, use a TCP-based health check or shell-based HTTP check with `/dev/tcp/`

2. **Frontend Dockerfile approach in dev**
   - What we know: In dev, frontend uses Vite dev server with HMR. In production, frontend is built and served as static files by Nginx.
   - What's unclear: Whether to use a separate Nginx-based Dockerfile for production frontend or serve static files directly from the main Nginx container
   - Recommendation: For Phase 1 (dev focus), use Vite dev server in Docker. Defer production frontend serving optimization to deployment phase.

3. **Alembic migration runner in Docker startup**
   - What we know: Migrations need to run before the backend starts accepting requests
   - What's unclear: Whether to run migrations as a Docker entrypoint script or as a separate init container
   - Recommendation: Use an entrypoint script in the backend container: `alembic upgrade head && exec uvicorn ...`. Simpler than a separate container, and migrations are fast for initial schema.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker Engine | All services | Not on local Mac | -- | Develop directly on VPS, or install Docker Desktop |
| Docker Compose v2 | Service orchestration | Not on local Mac | -- | Bundled with Docker Engine on VPS |
| Python 3.12 | Backend/worker containers | In Docker image | 3.12 | N/A (Dockerfile defines it) |
| Node.js 22+ | Frontend container | In Docker image | 22 LTS | N/A (Dockerfile defines it) |

**Missing dependencies with no fallback:**
- Docker Engine is not installed on the local development machine. Phase 1 requires Docker Compose to be the development environment. Options: (a) install Docker Desktop on macOS, (b) develop entirely on the VPS via SSH.

**Missing dependencies with fallback:**
- None -- all other dependencies are defined within Dockerfiles and do not require local installation.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest + pytest-asyncio (backend), Vitest (frontend -- later phases) |
| Config file | `backend/pytest.ini` or `pyproject.toml` -- Wave 0 |
| Quick run command | `docker compose exec backend pytest tests/ -x -q` |
| Full suite command | `docker compose exec backend pytest tests/ -v` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-01 | All 7 services start without errors | integration | `docker compose up -d && docker compose ps --format json` | Wave 0 |
| INFRA-02 | MinIO has 3 buckets | integration | `docker compose exec backend python -c "from minio import Minio; c=Minio('minio:9000', 'marketfoto', 'password', secure=False); print([b.name for b in c.list_buckets()])"` | Wave 0 |
| INFRA-03 | PostgreSQL has full schema | integration | `docker compose exec backend alembic current` | Wave 0 |
| INFRA-04 | Redis accepts connections | integration | `docker compose exec redis redis-cli ping` | Wave 0 |
| INFRA-05 | Nginx routes /api/* to backend and /* to frontend | integration | `curl -s http://localhost/api/health \| jq .status` | Wave 0 |
| INFRA-06 | Worker has 2GB memory limit | smoke | `docker compose config --format json \| jq '.services.worker.deploy.resources.limits.memory'` | Wave 0 |
| INFRA-07 | .env file has all required variables | unit | `pytest tests/test_config.py -x` | Wave 0 |
| INFRA-08 | /api/health returns 200 with all deps connected | integration | `curl -sf http://localhost/api/health` | Wave 0 |

### Sampling Rate
- **Per task commit:** Quick shell checks (service up, health endpoint responds)
- **Per wave merge:** Full suite of integration checks
- **Phase gate:** All 8 INFRA requirements verified via automated checks

### Wave 0 Gaps
- [ ] `backend/tests/test_config.py` -- validates Settings loads with all required fields
- [ ] `backend/tests/conftest.py` -- shared fixtures (async session, test client)
- [ ] `backend/pyproject.toml` or `pytest.ini` -- pytest configuration
- [ ] pytest + pytest-asyncio in requirements.txt

## Sources

### Primary (HIGH confidence)
- [SPECIFICATION.md](docs/SPECIFICATION.md) -- Full SQL schema (5 tables), Docker Compose definition, .env variables
- [STACK.md](.planning/research/STACK.md) -- Verified library versions for entire stack
- [ARCHITECTURE.md](.planning/research/ARCHITECTURE.md) -- Component boundaries, data flow patterns, resource allocation
- [PITFALLS.md](.planning/research/PITFALLS.md) -- rembg memory leak, MinIO maintenance mode, upload security
- [Docker Compose depends_on docs](https://docs.docker.com/compose/how-tos/startup-order/) -- Health check conditions
- [PostgreSQL Resource Consumption docs](https://www.postgresql.org/docs/current/runtime-config-resource.html) -- shared_buffers, work_mem tuning
- [Redis Eviction docs](https://redis.io/docs/latest/develop/reference/eviction/) -- maxmemory-policy options
- [RQ Workers docs](https://python-rq.org/docs/workers/) -- max-jobs parameter for recycling

### Secondary (MEDIUM confidence)
- [Chainguard MinIO image docs](https://images.chainguard.dev/directory/image/minio/overview) -- Free, maintained MinIO Docker images
- [MinIO bucket auto-creation in Docker Compose](https://banach.net.pl/posts/2025/creating-bucket-automatically-on-local-minio-with-docker-compose/) -- mc init container pattern
- [Alembic async with SQLAlchemy 2.0](https://berkkaraal.com/blog/2024/09/19/setup-fastapi-project-with-async-sqlalchemy-2-alembic-postgresql-and-docker/) -- env.py async runner pattern
- [Docker Compose override strategies](https://oneuptime.com/blog/post/2026-01-30-docker-compose-override-strategies/view) -- dev/prod file separation
- [FastAPI health check patterns](https://www.index.dev/blog/how-to-implement-health-check-in-python) -- Multi-dependency health endpoint
- [Docker health check best practices](https://oneuptime.com/blog/post/2026-01-30-docker-health-check-best-practices/view) -- start_period, interval, retries
- [Certbot Docker auto-renewal](https://www.buildwithmatija.com/blog/how-to-set-up-automatic-ssl-certificate-renewal-with-certbot-in-docker-containers) -- Certbot loop pattern

### Tertiary (LOW confidence)
- MinIO Chainguard image available commands (curl/wget) -- needs testing during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries/images verified in prior STACK.md research with npm/PyPI version checks
- Architecture: HIGH -- Docker Compose patterns well-documented, SPECIFICATION.md provides exact schema
- Pitfalls: HIGH -- verified via official GitHub issues, Docker docs, and MinIO maintenance announcement
- Health checks: MEDIUM -- MinIO Chainguard image specifics need testing
- PostgreSQL tuning: MEDIUM -- general guidelines applied to specific VPS constraints, may need runtime tuning

**Research date:** 2026-03-30
**Valid until:** 2026-04-30 (30 days -- stable infrastructure components)
