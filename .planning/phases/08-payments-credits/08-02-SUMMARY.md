---
phase: 08-payments-credits
plan: 02
subsystem: payments-backend
tags: [payment-history, subscription-cancel, cron, expiry]
dependency_graph:
  requires: [08-01]
  provides: [payment-history-api, subscription-cancel-api, subscription-cron]
  affects: [08-03]
tech_stack:
  added: []
  patterns: [sync-cron-job, paginated-query]
key_files:
  created:
    - backend/app/services/subscription_cron.py
  modified:
    - backend/app/api/payments.py
    - backend/app/schemas/payment.py
decisions:
  - "Sync SQLAlchemy engine for cron script -- avoids asyncio complexity for a simple standalone job"
  - "System cron over APScheduler/RQ Scheduler -- battle-tested, zero dependencies for daily job"
  - "Cancel-subscription clears subscription_yookassa_id only, plan stays active until expires_at"
metrics:
  duration: 2min
  completed: "2026-03-30T15:00:00Z"
---

# Phase 08 Plan 02: Payment History, Cancellation, and Subscription Expiry Summary

Payment history API with pagination, subscription cancellation preserving active plan, and daily cron script for expired subscription cleanup.

## What Was Built

### Payment History Endpoint (GET /api/payments/history)
- Paginated query with limit/offset (default 20, max 100)
- Returns PaymentHistoryResponse with payments list and total count
- Ordered by created_at desc
- Requires authentication

### Cancel Subscription Endpoint (POST /api/payments/cancel-subscription)
- Validates user has active (non-free) subscription
- Clears subscription_yookassa_id to cancel auto-renewal intent
- Does NOT change plan or credits -- plan stays active until subscription_expires_at
- Returns CancelSubscriptionResponse with Russian message and plan_active_until date
- Audit logging for cancellations

### Subscription Cron Job (backend/app/services/subscription_cron.py)
- Standalone script runnable via python -m or docker compose exec
- Finds users with subscription_expires_at < now() AND plan != 'free'
- Reverts each to: plan='free', credits_remaining=3, nullifies subscription fields
- Logs each expired user email and plan transition
- Uses sync SQLAlchemy engine for simplicity

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | be3e2db | feat(08-02): payment history and cancel-subscription endpoints |
| 2 | ed117cf | feat(08-02): daily cron job for expired subscription cleanup |

## Known Stubs

None.

## Self-Check: PASSED
