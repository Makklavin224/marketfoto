---
phase: 08-payments-credits
plan: 03
subsystem: payments-frontend
tags: [pricing-page, payment-success, credits-modal, react, tailwind]
dependency_graph:
  requires: [08-01]
  provides: [pricing-ui, payment-success-ui, credits-modal]
  affects: [06-canvas-editor, 09-dashboard]
tech_stack:
  added: [react-hot-toast]
  patterns: [billing-toggle, plan-cards, modal-hook]
key_files:
  created:
    - frontend/src/api/payments.ts
    - frontend/src/pages/PricingPage.tsx
    - frontend/src/pages/PaymentSuccessPage.tsx
    - frontend/src/components/PaymentModal.tsx
  modified:
    - frontend/src/router.tsx
    - frontend/package.json
decisions:
  - "Added react-hot-toast to package.json for error notifications (was listed in stack but missing from deps)"
  - "/pricing route is public so visitors can see plans before registering"
  - "PaymentSuccessPage retries user data fetch after 3s to handle delayed webhooks"
  - "usePaymentModal hook exported for Phase 7 editor integration"
metrics:
  duration: 3min
  completed: "2026-03-30T15:03:00Z"
---

# Phase 08 Plan 03: Frontend Payments UI Summary

Pricing page with 3 plan cards and billing toggle, payment success confirmation page, and credits-exhausted modal with one-time purchase and subscription options.

## What Was Built

### Payment API Client (frontend/src/api/payments.ts)
- PaymentVariant type with 5 variants
- paymentsApi.create(variant) for payment initiation
- paymentsApi.history(limit, offset) for payment history
- paymentsApi.cancelSubscription() for subscription cancellation
- Full TypeScript types for all responses

### Pricing Page (frontend/src/pages/PricingPage.tsx, 272 lines)
- Header: "Тарифы" with subtitle
- Monthly/annual billing toggle with "Выгоднее" badge
- 3 plan cards in responsive grid:
  - Free: 0 р/мес, 3 cards, watermark, basic templates
  - Starter: 499 р/мес or 3 990 р/год (crossed-out 5 988, savings 33%), 50 cards, all features
  - Business: 990 р/мес or 7 900 р/год (crossed-out 11 880, savings 34%), 200 cards, batch upload (soon)
- Starter highlighted with "Популярный" badge and blue ring
- Current plan shows green checkmark and "Текущий план"
- One-time purchase block: "1 карточка -- 49 р" with Купить button
- handleSubscribe redirects to YooKassa via API
- Loading spinner on clicked button, all buttons disabled during payment creation
- Unauthenticated users redirected to /auth

### Payment Success Page (frontend/src/pages/PaymentSuccessPage.tsx, 127 lines)
- Loading state: "Обрабатываем платеж..." with spinner (up to 5s)
- Refreshes user data on mount + retry after 3s for delayed webhooks
- Green checkmark icon
- Shows new plan name and credits_remaining
- "Создать карточку" -> /editor, "На главную" -> /dashboard

### Payment Modal (frontend/src/components/PaymentModal.tsx, 164 lines)
- Backdrop blur overlay with centered card
- Warning icon + "Карточки закончились" heading
- One-time purchase: "1 карточка -- 49 р" with Купить button -> YooKassa redirect
- Subscription link: "Или подключите подписку от 499 р/мес" -> /pricing
- Close (X) button
- usePaymentModal() hook exported for Phase 7 integration

### Router Updates (frontend/src/router.tsx)
- /pricing: public route (no ProtectedRoute)
- /payment/success: protected route (inside ProtectedRoute children)
- All existing routes preserved

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] react-hot-toast not in package.json**
- **Found during:** Task 1
- **Issue:** Plan specifies react-hot-toast for error notifications but it was missing from package.json dependencies
- **Fix:** Added "react-hot-toast": "^2.5.2" to frontend/package.json dependencies
- **Files modified:** frontend/package.json

## Commits

| # | Hash | Message |
|---|------|---------|
| 1 | 30df020 | feat(08-03): payment API client and PricingPage with plan cards |
| 2 | 2f5a451 | feat(08-03): PaymentSuccessPage, PaymentModal, and router wiring |

## Known Stubs

None -- all components are fully implemented with real API integration.

## Self-Check: PASSED
