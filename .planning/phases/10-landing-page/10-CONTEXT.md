# Phase 10: Landing Page - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning
**Source:** SPECIFICATION.md Module 5 (Landing & Marketing)

<domain>
## Phase Boundary

Marketing landing page: hero with CTA, before/after slider, "how it works" steps, marketplace logos, pricing cards, FAQ accordion, footer. SEO, mobile-first responsive, LCP < 3s.

</domain>

<decisions>
## Implementation Decisions

- **D-01:** Hero: "Профессиональные карточки для WB и Ozon за 30 секунд" + subtitle + CTA "Попробовать бесплатно" → /auth?mode=register + before/after slider
- **D-02:** "Как это работает": 3 steps with icons (камера, сетка, скачивание)
- **D-03:** "До / После": 3-4 examples (одежда, электроника, косметика, еда) in 2-col grid
- **D-04:** "Для какого маркетплейса": WB, Ozon, ЯМ logos + "Правильные размеры автоматически"
- **D-05:** "Тарифы": same PricingPage component from Phase 8 (embed)
- **D-06:** FAQ: accordion, 5-7 questions (formats, pricing, quality, speed, payment, API)
- **D-07:** Footer: О сервисе, Тарифы, Поддержка (email), Политика конфиденциальности
- **D-08:** SEO: title "MarketFoto — карточки для WB и Ozon за 30 секунд", OG tags
- **D-09:** Mobile-first: breakpoints 640/768/1024/1280. Mobile: larger buttons, swipe carousel instead of slider
- **D-10:** LCP < 3s: lazy-load images, optimized assets

### Claude's Discretion
- Before/after slider implementation (CSS range input vs JS library)
- FAQ content (exact questions and answers)
- Placeholder images for before/after examples
- Яндекс.Метрика counter placement

</decisions>

<canonical_refs>
- `docs/SPECIFICATION.md` — Module 5: Landing (sections, SEO, responsive)
- `docs/PROJECT_IDEA.md` — Competitor comparison, value props

</canonical_refs>

<code_context>
- Phase 8: PricingPage component (reuse on landing)
- Phase 2: Auth redirect flow (/auth?mode=register)

</code_context>

<specifics>
- Landing is the "/" route — public, no auth required
- Vite build produces static HTML — no SSR needed
- Before/after examples need placeholder images (generate or use colored rectangles for MVP)

</specifics>

<deferred>
- A/B testing of hero text
- Video demo section
- Customer testimonials

</deferred>

---
*Phase: 10-landing-page*
