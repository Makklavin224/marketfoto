# Phase 1: Infrastructure Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-30
**Phase:** 01-infrastructure-foundation
**Areas discussed:** DB migrations, rembg model setup, Dev workflow, MinIO access, Worker count, SSL

---

## DB Migrations

| Option | Description | Selected |
|--------|-------------|----------|
| Alembic (рекомендую) | SQLAlchemy модели -> auto-generate миграций. Версионирование, откат, безопасные ALTER TABLE | ✓ |
| Raw SQL init | SQL из спеки в init.sql. Простота MVP, но ручное управление изменениями | |
| На твоё усмотрение | Claude решит на этапе планирования | |

**User's choice:** Alembic
**Notes:** None

---

## rembg Model Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Build-time (рек.) | Скачивать birefnet-general в Dockerfile. Слой ~1.5GB, контейнер стартует мгновенно | ✓ |
| Runtime | Скачивать при первом запуске. Быстрый build, но первый запрос ждёт скачивание | |
| u2net как fallback | Начать с u2net (300MB), перейти на birefnet позже | |

**User's choice:** Build-time, birefnet-general
**Notes:** None

---

## Dev Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| Docker + volumes (рек.) | Volume mounts для backend/frontend. Uvicorn --reload, Vite HMR. Один docker compose up | ✓ |
| Local + Docker infra | Backend/frontend локально, только postgres/redis/minio в Docker | |
| На твоё усмотрение | Claude решит | |

**User's choice:** Docker + volumes
**Notes:** None

---

## MinIO Access

| Option | Description | Selected |
|--------|-------------|----------|
| Presigned URLs (рек.) | Клиент загружает напрямую в MinIO по signed URL. Скачивание тоже через signed URL (1 час) | ✓ |
| Proxy через FastAPI | Файлы идут через бэкенд. Проще настроить, но нагружает сервер | |
| Гибрид | Upload через FastAPI, download через presigned URL | |

**User's choice:** Presigned URLs для обоих направлений
**Notes:** None

---

## Worker Count (follow-up)

| Option | Description | Selected |
|--------|-------------|----------|
| 1 worker (рек. для MVP) | Один worker с лимитом 2GB. На shared VPS безопаснее | ✓ |
| 2 workers | Параллельная обработка, но 4GB только на workers | |

**User's choice:** 1 worker, но на отдельном VPS
**Notes:** Пользователь решил выделить отдельный VPS чисто под MarketFoto. Расчёт: 4GB RAM / 2 vCPU / 50GB SSD.

---

## SSL

| Option | Description | Selected |
|--------|-------------|----------|
| Certbot в compose (рек.) | Отдельный certbot сервис, автообновление Let's Encrypt | ✓ |
| Без SSL пока | Только HTTP для MVP, SSL перед деплоем | |
| На твоё усмотрение | Claude решит | |

**User's choice:** Certbot в compose
**Notes:** Как на других проектах

---

## Claude's Discretion

- Nginx configuration details
- Docker network topology
- PostgreSQL tuning for 4GB VPS
- Redis configuration
- docker-compose.override.yml structure

## Deferred Ideas

None
