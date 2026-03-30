---
phase: 08-payments-credits
plan: 01
subsystem: payments-backend
tags: [yookassa, webhooks, payments, credits, idempotency]
dependency_graph:
  requires: [01-01, 01-02]
  provides: [payment-api, webhook-processing, credit-management]
  affects: [08-02, 08-03]
tech_stack:
  added: [yookassa-sdk]
  patterns: [ip-whitelist, webhook-idempotency, atomic-credit-update]
key_files:
  created:
    - backend/app/schemas/payment.py
    - backend/app/services/payment.py
    - backend/app/api/payments.py
  modified:
    - backend/app/main.py
decisions:
  - "YooKassa SDK aliased as YooKassaPayment to avoid collision with SQLAlchemy Payment model"
  - "Webhook always returns 200 even on processing errors to prevent YooKassa retries (Pitfall 9)"
  - "Annual plan variants mapped to base plan name (starter_annual -> starter) for user.plan column constraint"
  - "IP whitelist parsed lazily and cached for performance"
metrics:
  duration: 3min
  completed: "2026-03-30T14:58:00Z"
---

# Phase 08 Plan 01: YooKassa Payment Backend Summary

YooKassa payment creation with SDK integration, webhook processing with IP whitelist and idempotency, and atomic credit/plan updates for 5 pricing variants.

## What Was Built

### Payment Schemas (backend/app/schemas/payment.py)
- `CreatePaymentRequest`: Validates 5 variant literals (starter, business, starter_annual, business_annual, one_time)
- `CreatePaymentResponse`: Returns payment_id + confirmation_url for YooKassa redirect
- `PaymentResponse`: Full payment record with from_attributes for ORM serialization

### Payment Service (backend/app/services/payment.py)
- `PLAN_CONFIG`: 5 pricing variants with correct kopeck amounts (starter 49900, business 99000, starter_annual 399000, business_annual 790000, one_time 4900)
- `YOOKASSA_IP_RANGES`: 7 official YooKassa IP ranges for webhook validation
- `check_ip_whitelist()`: Validates IPs against parsed network ranges using `ipaddress` module
- `create_yookassa_payment()`: Configures SDK, calls YooKassa Payment.create, persists Payment record
- `process_webhook()`: Handles payment.succeeded with idempotency check, updates user plan/credits atomically
- Documented atomic credit deduction pattern for Phase 7 render endpoint

### Payment API Router (backend/app/api/payments.py)
- `POST /api/payments/create`: Authenticated, creates YooKassa payment, returns confirmation_url
- `POST /api/payments/webhook`: No auth, IP whitelist, idempotent, always returns 200
- X-Forwarded-For support for nginx proxy

### App Wiring (backend/app/main.py)
- Payments router included alongside health, auth, images, templates routers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] No merge conflict in main.py**
- **Found during:** Task 2
- **Issue:** Plan warned about git merge conflict markers in main.py, but the file was clean
- **Fix:** Simply added the payments router import and include without conflict resolution
- **Files modified:** backend/app/main.py

## Verification Results

- All 5 PLAN_CONFIG variants validated with correct amounts
- IP whitelist correctly accepts YooKassa IPs, rejects others
- All Python files pass AST validation
- main.py includes all 5 routers (health, auth, images, payments, templates)
- No merge conflict markers present

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 2ca1570 | feat(08-01): payment schemas and YooKassa service layer |
| 2 | d130ee9 | feat(08-01): payment API router with /create and /webhook endpoints |

## Known Stubs

None -- all endpoints are fully implemented with real YooKassa SDK integration.

## Self-Check: PASSED
