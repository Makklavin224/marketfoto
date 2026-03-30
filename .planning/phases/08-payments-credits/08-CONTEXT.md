# Phase 8: Payments & Credits - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** SPECIFICATION.md Module 4 (Payments)

<domain>
## Phase Boundary

YooKassa integration: subscriptions (starter/business monthly/annual) + one-time purchase. Webhook handling with idempotency. Credit system enforcement. Pricing page, payment success page, payment modal. Cron job for expired subscriptions.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** POST /api/payments/create — creates YooKassa payment, returns confirmation_url for redirect
- **D-02:** 6 variants: starter 49900коп, business 99000, starter_annual 399000, business_annual 790000, one_time 4900
- **D-03:** POST /api/payments/webhook — YooKassa notifications, IP whitelist check, idempotency by payment_id
- **D-04:** payment.succeeded → update user.plan, credits_remaining, subscription_expires_at
- **D-05:** one_time → credits_remaining += 1 (don't change plan)
- **D-06:** GET /api/payments/history — user's payment list
- **D-07:** POST /api/payments/cancel-subscription — cancel auto-renewal, plan active until expires_at
- **D-08:** Cron: daily check if subscription_expires_at < now and no autopay → plan='free', credits=3
- **D-09:** PricingPage: 3 cards + month/year toggle + one-time block. PaymentSuccess: green check + new plan. PaymentModal: "Закончились карточки" with options
- **D-10:** Prices in kopecks. YooKassa SDK (yookassa ~3.10). Shop ID + Secret Key from env.
- **D-11:** Atomic credit deduction: UPDATE users SET credits_remaining = credits_remaining - 1 WHERE id = ? AND credits_remaining > 0

### Claude's Discretion
- YooKassa recurring payment implementation details
- Webhook retry handling from YooKassa side
- Cron job implementation (APScheduler vs system cron vs RQ scheduled)

</decisions>

<canonical_refs>
## Canonical References

- `docs/SPECIFICATION.md` — Module 4: Payments (SQL schema, API, webhook handling, business logic, edge cases)
- `.planning/research/PITFALLS.md` — YooKassa recurring approval, credit race conditions
- `CLAUDE.md` — yookassa ~3.10

</canonical_refs>

<code_context>
## Existing Code Insights

- Phase 2: Auth endpoints, JWT dependency, User model with plan/credits fields
- Phase 1: Payment SQLAlchemy model already created

</code_context>

<specifics>
- Double webhook → idempotent by yookassa_payment_id
- Refund → plan='free', credits=3
- Active subscription + new payment → extend expires_at, don't overwrite

</specifics>

<deferred>
- 54-FZ fiscal receipts — not required for self-employed
- Stripe alternative — YooKassa only for RU market

</deferred>

---
*Phase: 08-payments-credits*
*Context gathered: 2026-03-30*
