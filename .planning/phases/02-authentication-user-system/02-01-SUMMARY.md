---
phase: 02-authentication-user-system
plan: 01
subsystem: backend-auth
tags: [auth, jwt, argon2, fastapi, pydantic]
dependency_graph:
  requires: [01-02]
  provides: [auth-api, jwt-tokens, password-hashing, user-registration]
  affects: [02-02, 02-03, 03-upload, 04-processing, 08-payments]
tech_stack:
  added: [pwdlib, PyJWT, email-validator]
  patterns: [HTTPBearer dependency injection, Argon2 password hashing, Redis-backed password reset tokens]
key_files:
  created:
    - backend/app/schemas/__init__.py
    - backend/app/schemas/auth.py
    - backend/app/services/__init__.py
    - backend/app/services/auth.py
    - backend/app/api/deps.py
    - backend/app/api/auth.py
  modified:
    - backend/app/main.py
    - backend/requirements.txt
decisions:
  - Used Redis with 1-hour TTL for password reset tokens (MVP approach, no email sending)
  - Console-logged reset URL for development visibility
  - Followed spec 404 for forgot-password (email not found) rather than silent 200
metrics:
  completed: "2026-03-30"
  tasks: 2
  files: 8
---

# Phase 02 Plan 01: Auth Backend Summary

Complete auth backend with Pydantic schemas, pwdlib/Argon2 password hashing, PyJWT token management, and 5 REST endpoints per SPECIFICATION.md Module 1.

## One-liner

JWT auth backend with Argon2 hashing (pwdlib), 5 endpoints (register/login/forgot/reset/me), Redis-backed password reset tokens.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Pydantic schemas, auth service, get_current_user dep | bf48e81 | schemas/auth.py, services/auth.py, api/deps.py, requirements.txt |
| 2 | Auth router with 5 endpoints and main.py wiring | a4398b5 | api/auth.py, main.py |

## Key Implementation Details

- **Password hashing**: pwdlib with Argon2Hasher (OWASP #1 recommendation), NOT passlib
- **JWT**: PyJWT with HS256, 7-day expiry (168 hours), payload contains user_id and plan
- **Schemas**: Pydantic v2 with EmailStr validation, password min 6 chars via field_validator, from_attributes=True for ORM serialization
- **Dependency**: get_current_user extracts Bearer token via HTTPBearer, catches ExpiredSignatureError and InvalidTokenError with 401
- **Register**: Creates user with plan='free', credits_remaining=3, credits_reset_at=now+30days, email stored lowercase
- **Login**: Returns JWT on valid credentials, generic "Invalid credentials" on failure (no email enumeration)
- **Forgot password**: Stores reset token in Redis with 1-hour TTL, logs URL to console for MVP
- **Reset password**: Validates token from Redis, updates password_hash, deletes token after use
- **Me**: Returns full user profile via get_current_user dependency

## Deviations from Plan

None -- plan executed exactly as written.

## Requirements Coverage

- AUTH-01: Registration with email/password, Argon2 hashing
- AUTH-02: Login returns JWT valid for 7 days, HS256
- AUTH-03: Password reset flow with Redis-backed token storage
- AUTH-04: Invalid/expired JWT returns 401
- AUTH-05: GET /api/auth/me returns full user profile
- AUTH-06: Registration defaults to plan='free', credits=3, reset in 30 days
- AUTH-07: All queries parameterized via SQLAlchemy ORM, email validated via Pydantic EmailStr

## Known Stubs

None -- all endpoints are fully functional with real database and Redis operations.
