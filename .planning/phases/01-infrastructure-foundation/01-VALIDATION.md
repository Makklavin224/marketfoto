---
phase: 1
slug: infrastructure-foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 7.x (backend), docker compose health checks (infra) |
| **Config file** | backend/pytest.ini (Wave 0 creates) |
| **Quick run command** | `docker compose exec backend pytest tests/ -x -q` |
| **Full suite command** | `docker compose up --wait && docker compose exec backend pytest tests/ -v` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `docker compose exec backend pytest tests/ -x -q`
- **After every plan wave:** Run `docker compose up --wait && docker compose exec backend pytest tests/ -v`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01 | 01 | 1 | INFRA-01 | integration | `docker compose up --wait` | ❌ W0 | ⬜ pending |
| 01-02 | 01 | 1 | INFRA-03 | integration | `docker compose exec backend pytest tests/test_db.py` | ❌ W0 | ⬜ pending |
| 01-03 | 01 | 1 | INFRA-02 | integration | `docker compose exec backend pytest tests/test_minio.py` | ❌ W0 | ⬜ pending |
| 01-04 | 01 | 1 | INFRA-04 | integration | `docker compose exec backend pytest tests/test_redis.py` | ❌ W0 | ⬜ pending |
| 01-05 | 02 | 1 | INFRA-05 | integration | `curl -s http://localhost/api/health` | ❌ W0 | ⬜ pending |
| 01-06 | 02 | 1 | INFRA-06 | unit | `docker inspect worker \| grep MemoryLimit` | ❌ W0 | ⬜ pending |
| 01-07 | 02 | 1 | INFRA-07 | unit | `test -f .env.example` | ❌ W0 | ⬜ pending |
| 01-08 | 02 | 1 | INFRA-08 | integration | `curl -s http://localhost/api/health \| python -m json.tool` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/conftest.py` — shared fixtures (db session, redis, minio clients)
- [ ] `backend/tests/test_db.py` — PostgreSQL connection and schema verification
- [ ] `backend/tests/test_minio.py` — MinIO bucket existence checks
- [ ] `backend/tests/test_redis.py` — Redis connection test
- [ ] `backend/pytest.ini` — pytest configuration
- [ ] pytest installed in backend requirements.txt

*Test stubs created during planning, filled during execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Nginx routes /api/* to backend | INFRA-05 | Nginx routing is best verified via HTTP | `curl http://localhost/api/health` returns 200, `curl http://localhost/` returns frontend HTML |
| Docker Compose starts all 7 services | INFRA-01 | Full stack integration | `docker compose up --wait` exits 0, `docker compose ps` shows 7 running |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
