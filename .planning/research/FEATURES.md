# Feature Landscape

**Domain:** Marketplace product card generation SaaS (Russian market: WB, Ozon, Yandex.Market)
**Researched:** 2026-03-30
**Overall confidence:** HIGH (12+ Russian-market competitors analyzed, marketplace photo requirements verified, pricing validated)

## Table Stakes

Features users expect. Missing = product feels incomplete. These are non-negotiable for marketplace sellers.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Background removal | Every competitor has it (WBCard, Fabula, Neiro-Card, 24AI, SUPA, Wondercard). Sellers photograph on kitchen tables, couches, floors. This is the core "magic moment." | Medium | rembg (U2NET/birefnet) is solid for product photos. Quality gap vs Photoroom exists (Photoroom scores 70.8% vs Remove.bg 41.7% in edge detection) but acceptable for product cards where subjects have clear edges. Fine hair/lace will suffer -- flag this for clothing sellers. |
| Marketplace-correct export sizes | WB (900x1200, 3:4 aspect, min 900px, max 8000px, JPG compression >= 85%), Ozon (1200x1200, 1:1), YM (800x800, 1:1). Wrong size = rejected upload or poor display. | Low | Must include safe zones: WB prohibits schemas/sketches on main image; Ozon now allows infographics on all images (changed from previous policy). Presets with visual safe-zone overlay in editor. |
| Template library (50+ minimum at launch) | WBCard has 300+ niche-specific templates. Fabula ships hundreds. Wondercard has templates per marketplace. 5 templates (as currently planned in PROJECT.md) is a demo, not a product. Sellers will compare to competitors and leave instantly. | **Critical** | Need templates across 10 niches minimum: clothing, electronics, cosmetics, food, home goods, children's, tools/DIY, sports, auto accessories, jewelry/accessories. Each niche has visual conventions. **This is the single biggest risk in the current plan.** |
| Text overlay with styling | Sellers add price badges, feature callouts, size charts, material specs, composition info. Text IS the infographic. | Medium | 15-20 curated Russian-friendly fonts minimum (Montserrat, Inter, Roboto, PT Sans, Golos, Nunito, Rubik -- all with Cyrillic). Color picker, font size, bold/italic, text alignment. fabric.js handles this natively. |
| Infographic elements library | Pre-made badges ("Хит продаж", "Новинка", "-30%", "Бесплатная доставка", "Гарантия"), icons (checkmarks, arrows, stars, size indicators), callout boxes, price tags, comparison tables. | Medium | 100+ pre-made elements. Sellers don't design from scratch -- they pick and place. This library is a retention driver. Growing it is ongoing work. |
| Canvas drag-and-drop editor | All competitors have it. WBCard, Flyvi, SUPA all provide visual editors. Sellers expect to move, resize, and layer elements visually. | High | fabric.js: drag, resize, rotate, layer ordering, snap-to-grid/alignment guides, undo/redo (Ctrl+Z), copy/paste elements. Must feel responsive -- no lag on interactions. |
| Watermark on free tier | Industry standard: WBCard free tier allows downloads without watermark but limits features. Flyvi free tier adds watermark. Neiro-Card gives 5 free generations. | Low | Semi-transparent diagonal "MarketFoto" text, opaque enough to prevent usage but transparent enough to show quality. Removes instantly on paid plan. |
| Dashboard with card history | Sellers manage dozens of SKUs. WBCard stores up to 10 templates in cloud. Need to find, re-edit, re-download previous cards. | Medium | Grid view with thumbnails, search by name, filter by marketplace (WB/Ozon/YM), re-edit button (reopens in editor), bulk download, delete. |
| Multiple slides per product | WB allows up to 10 images per card, Ozon up to 15. A good product card is 5-7 slides: main photo, features, size chart, benefits, lifestyle, reviews/social proof, packaging. | Medium | Project-based workflow: one product = one project with multiple pages/slides. Each slide is an independent canvas. Copy elements between slides. |
| Registration + auth (email/password) | Baseline SaaS requirement. | Low | JWT stateless auth. Email verification. Password reset via email. |
| Payment system (YooKassa) | Must accept Russian bank cards (Mir, Visa, Mastercard). YooKassa is the only production-ready option for RU market with 3% commission. | Medium | Subscription (auto-renewal), one-time purchase, webhook handling with idempotency, 54-FZ receipt generation (required by law). |
| Processing status indicator | Background removal takes 2-6s on CPU. Without feedback, users think the app is broken. Every competitor shows progress. | Low | SSE or polling. Animated skeleton/spinner during processing. "Removing background..." -> "Applying template..." -> "Ready!" |
| Upload from any device | Phone photos are primary input. Must work on mobile Safari/Chrome. | Low | react-dropzone or native file input. Accept JPG/PNG/WebP up to 10MB. Drag-and-drop on desktop, camera/gallery picker on mobile. Image compression on upload if oversized. |

## Differentiators

Features that create competitive advantage over WBCard, Wondercard, Fabula, Neiro-Card, 24AI, Flyvi, SUPA, Photoroom, and Canva.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **30-second speed claim** | Competitors (WBCard, Wondercard) take 5-10 minutes per card. If MarketFoto delivers upload -> bg removal -> auto-template -> download in 30 seconds, this is THE killer feature worth building the whole product around. | High | Requires: instant bg removal (~3-5s CPU), smart template auto-application (center product, scale to fit, add default text placeholders), one-click export. Pre-warm the processing pipeline. The claim must be real -- measure and optimize. |
| **Aggressive price undercut (499/990 rub)** | Neiro-Card Starter: 890 rub/mo. Wondercard: ~900 rub/mo. Flyvi Pro: 599 rub/mo. WBCard Pro: 550 rub/mo. 24AI: 2,500+ rub/mo. MarketFoto Business at 990 rub/mo UNLIMITED is the most aggressive unlimited offer in the market. | Low (pricing decision) | Unit economics support this: rembg=free, Pillow=free, VPS already paid. ~0.5 rub/photo cost. Zero API dependency = zero marginal cost per card. This is the structural moat. |
| **One-time purchase (49 rub/card)** | Most competitors are subscription-only. Casual sellers and dropshippers who make 3-5 cards/month don't want a subscription. Fabula offers per-generation pricing (~7 rub/gen) but most others don't. | Low | YooKassa single payment. Impulse-buy pricing. Upsell to subscription when usage grows. "Try one card for 49 rub" is easier than "subscribe for 499 rub." |
| **Russian-first, marketplace-specific** | Photoroom is US-focused (Etsy, Amazon, Depop). Canva is generic. WBCard is WB-focused. MarketFoto covers WB + Ozon + YM with Russian UI, Russian fonts, Russian marketplace presets from day one. | Low | No internationalization needed initially. Every UI string, every tutorial, every template is in Russian for Russian sellers. This is table stakes positioning. |
| **AI text generation** (Phase 2) | Wondercard and Fabula both offer AI-generated text/descriptions. GigaChat (Sber) and YandexGPT both have freemium APIs optimized for Russian. Generate product feature bullets, SEO titles, compelling callout text for infographics. | Medium | YandexGPT or GigaChat with marketplace-specific system prompts. "Generate 5 feature bullets for this [product category] for Wildberries infographic." |
| **Batch processing** (Phase 2) | Photoroom handles 500 images at once. 24AI supports bulk via API. Sellers with 50+ SKUs need batch desperately. Most Russian competitors either don't offer it or limit it heavily. | High | Upload 20 photos -> select template -> auto-apply to all -> preview each -> adjust individually -> download zip. Redis RQ is already planned. Progress bar per image. |
| **AI background generation** (Phase 2) | 24AI and Fabula generate realistic AI backgrounds (studio lighting, lifestyle scenes, seasonal themes). Replace removed background with an AI-generated contextual scene instead of just white/solid color. | High | Requires image generation API (Kandinsky by Sber is free for Russian market, or Stable Diffusion API). "Place this blender on a modern kitchen counter" type prompts. |
| **Direct marketplace upload via API** (Phase 3) | MOST competitors do NOT do this. WB and Ozon both have APIs for uploading card images. Eliminating "download then re-upload" step saves time and reduces friction. Only Perenesi.ru and enterprise tools do cross-marketplace upload. | High | WB API: upload image to card by nmId. Ozon API: content/media endpoint. Seller provides API keys via secure input. Each marketplace API is separate integration work. |
| **Niche-specific smart template suggestions** | Auto-detect product category from uploaded photo (clothing vs electronics vs food) and suggest the 5 best templates for that niche. Reduces decision fatigue. No competitor does this well. | Medium | Simple image classification (ResNet/MobileNet or GPT-4V API call). Saves seller from scrolling through 300 templates to find relevant ones. |
| **A/B test card variants** (Phase 3) | Services like Marpla offer A/B testing for marketplace photos. MarketFoto could generate 2-3 template variants and help sellers pick the highest-converting design. | Very High | Requires either integration with marketplace analytics APIs or building own tracking. Phase 3+ feature. Even a simple "generate 3 variants" without performance tracking adds value. |
| **Template marketplace (community)** (Phase 3+) | Designers create and sell templates. Platform takes 30% commission. Creates content flywheel -- more templates attract more sellers, more sellers attract more designers. | Very High | Requires: designer upload flow, review/approval system, revenue sharing, payout system. Only build when user base exceeds 5K+ active users. |

## Anti-Features

Features to explicitly NOT build. Avoiding these keeps scope manageable and the product positioned correctly.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full graphic design suite (Canva clone)** | Canva exists. Flyvi exists. SUPA exists. Sellers don't need presentation templates, social media posts, or business cards. Feature creep will kill the 7-10 day timeline. | Stay laser-focused on marketplace product cards. Every feature must answer: "Does this help a seller create a better card for WB/Ozon/YM?" If no, cut it. |
| **AI product image generation (fake products)** | Marketplace policies increasingly penalize AI-generated product images that don't match physical reality. Sellers need enhanced REAL photos, not synthetic products. Also requires expensive GPU infrastructure. | Focus on enhancing real photos: better backgrounds (removal + replacement), better composition (templates), better infographics (text + badges). Not generating fake products. |
| **Mobile native app** | Product card creation requires precise positioning, multi-element text editing, comparing results at zoom. Phone screens are too small for the editing workflow. Responsive web is sufficient. | Build responsive web. Mobile users can upload photos and do quick edits. Desktop users do detailed editing. PWA (installable) later if demand exists. |
| **Video card generation** | WB/Ozon support video but it's a 10x complexity increase. Video background removal, video rendering pipeline, video editing UX -- completely different product. | Photo cards only. If video demand emerges, offer simple "slideshow from card slides" (images -> video with transitions) rather than full video editing. Phase 4+ at earliest. |
| **Built-in marketplace analytics/SEO** | MPStats, Moneyplace, SellerBoard, Marpla own this space with massive data infrastructure. Building analytics requires product data crawling at scale. | Stay in "visual content creation" lane. If adding text generation with SEO keywords, it's for the card image itself, not for analytics dashboards. |
| **Team collaboration** (MVP) | Primary audience is solo small sellers (880K individuals). Teams are for agencies. Adds auth complexity (roles, permissions, shared projects, conflict resolution). | Defer to Phase 3. Single-user product first. Add team accounts only when agency customers demand them with wallets. |
| **API / white-label** (MVP) | Requires API documentation, rate limiting, versioning, SLA guarantees, developer support. Massive distraction from core product launch. | Defer to Phase 3+. Build the product, prove the value, get paying users, then expose programmatically. |
| **Marketplace listing management** (titles, descriptions, pricing, inventory) | This is a different product category entirely (SelSup, LK.MARKET territory). Scope explosion. | "Visual content creation" only. If adding AI text generation, it's for text ON the card image, not for marketplace listing fields. |
| **Custom font upload** (MVP) | Font rendering in Pillow backend is tricky (TTF/OTF compatibility, subset embedding, licensing). WBCard offers it in Pro but few sellers need custom fonts. | Ship with 15-20 curated Russian-friendly fonts. Covers 95% of use cases. Custom upload in Phase 2 if demand proves real. |
| **360-degree product views** | Requires special photography setup (turntable, controlled lighting). Completely different from phone photos. Tiny fraction of sellers would use it. | Out of scope permanently. Different target audience, different product category. |
| **Social media format exports** | Instagram, VK, Telegram post sizes. Dilutes marketplace focus. Flyvi and Canva already serve this market. | Only WB/Ozon/YM dimensions. Social formats in Phase 4+ if at all. Don't try to be everything. |

## Feature Dependencies

```
Registration/Auth
  |
  +-> Dashboard (requires user accounts)
  |     |
  |     +-> Card History (requires saved cards linked to user)
  |     +-> Credit System (requires user + billing tracking)
  |
  +-> Payment System (requires user accounts)
        |
        +-> Subscriptions (auto-renewal via YooKassa)
        +-> One-time purchases (per-card payment)
        +-> Watermark removal (plan check on render)

Photo Upload + Validation
  |
  +-> Background Removal [async via Redis RQ]
  |     |
  |     +-> AI Background Generation (Phase 2 -- requires bg-removed cutout)
  |
  +-> Template Selection (can happen in parallel with bg removal)
        |
        +-> Canvas Editor [fabric.js]
        |     |
        |     +-> Photo placement (drag, resize, rotate)
        |     +-> Text overlay (styled Cyrillic text)
        |     +-> Infographic elements (badges, icons, callouts)
        |     +-> Layer management (z-order, visibility)
        |     +-> Undo/redo stack
        |
        +-> Backend Render [Pillow, async via Redis RQ]
              |
              +-> Marketplace-size export (WB/Ozon/YM presets)
              +-> Watermark application (conditional on user plan)
              +-> Save to MinIO storage
              +-> Download via presigned URL

Template Library [independent, loaded from DB + MinIO]
  |
  +-> Niche-based categories (clothing, electronics, etc.)
  +-> Template preview/thumbnail system
  +-> Template search/filter

Batch Processing (Phase 2)
  |
  +-> Requires: bg removal + templates + render all working and stable
  +-> Requires: Redis RQ proven at 20+ concurrent jobs
  +-> New: batch upload UI, progress per image, zip generation

AI Text Generation (Phase 2)
  |
  +-> Requires: Canvas Editor (to place generated text on card)
  +-> Requires: YandexGPT or GigaChat API integration
  +-> Requires: marketplace-specific prompt templates

Direct Marketplace Upload (Phase 3)
  |
  +-> Requires: Final rendered images in correct format
  +-> Requires: Seller's marketplace API keys (secure storage)
  +-> Requires: WB Content API + Ozon Content API integrations (separate work)
```

## MVP Recommendation

**Ship in MVP (Phase 1 -- 7-10 days):**

1. **Auth** -- email/password, JWT, email verification. Quick registration, no OAuth complexity.
2. **File upload + background removal** -- THE core "magic moment." Upload photo, wait 3-5s, see clean cutout. Immediate value demonstration.
3. **50+ templates across 10 niches** -- **CRITICAL CHANGE FROM CURRENT PLAN.** 5 templates is not a product. Source templates from Figma community (free marketplace card packs exist), adapt and brand them. Hire a designer for 2-3 days if needed. This is the most important non-engineering work for launch.
4. **Canvas editor** -- move photo, add text, add badges, resize elements. fabric.js core features. Skip advanced tools (no custom shapes, no filters, no blend modes).
5. **Marketplace-correct export** -- one-click "Export for WB" / "Export for Ozon" / "Export for YM" with correct dimensions and safe zones.
6. **Landing page** -- hero with before/after demo, 3 steps ("Upload, Edit, Download"), pricing table, FAQ, CTA.
7. **Free tier (3 cards/month with watermark)** -- trial-to-paid conversion lever.
8. **YooKassa payments** -- subscription (499 Starter / 990 Business) + one-time (49 per card).
9. **Dashboard with card history** -- save, find, re-edit, re-download.

**Template strategy is make-or-break:** Budget 2-3 days specifically for template creation. Each template needs: a background design, text placeholder zones, pre-positioned badge areas, and a thumbnail preview. Templates should be stored as JSON (fabric.js canvas state) so they load instantly in the editor.

**Defer to Phase 2:**

- **Batch processing** (20+ photos at once) -- sellers survive one-at-a-time initially but will churn by month 2 without batch
- **AI text generation** (YandexGPT/GigaChat) -- nice differentiator, not launch-blocking
- **AI background generation** -- needed to compete with Fabula/24AI but not for initial launch
- **Referral program** -- growth mechanics after product-market fit
- **Custom font upload** -- 15-20 curated fonts suffice

**Defer to Phase 3:**

- **Direct marketplace upload via API** -- high-value but significant engineering
- **Team accounts** -- agency feature
- **OAuth (VK/Yandex)** -- convenience, not blocking
- **API access for CMS/1C** -- enterprise feature
- **Template marketplace (community)** -- needs user base first
- **A/B test card variants** -- needs data/analytics infrastructure

## Competitive Pricing Landscape

| Service | Free Tier | Entry Paid | Mid Tier | Unlimited? | Model |
|---------|-----------|------------|----------|------------|-------|
| WBCard | Yes (limited bg removal) | 550 rub/mo (Pro) | 390 rub/mo (annual) | No (12 bg gens/mo on Pro) | Subscription |
| Neiro-Card.AI | 5 gen/mo | 890 rub/mo (1K gens) | 2,990 rub/mo (5K gens) | No (capped) | Per-generation |
| Fabula AI | Points-based free | ~69 rub/10 gens | -- | No | Pay-per-card |
| Flyvi | Yes (watermark) | 599 rub/mo (Pro) | 3,600 rub/mo (Business) | Yes (Pro/Biz) | Subscription |
| SUPA | Limited free | ~1,000-3,000 rub/mo | -- | No | Subscription |
| Wondercard | Limited free | ~900 rub/mo | -- | Unclear | Subscription |
| 24AI | Free tier | ~2,500-5,000 rub/mo | Higher (API/batch) | No | Per-generation + sub |
| Photoroom | Free (10 exports) | ~1,000 rub/mo ($9.99) | -- | No (batch limits) | Subscription |
| **MarketFoto** | 3 cards/mo (watermark) | **499 rub/mo (50 cards)** | **990 rub/mo (unlimited)** | **YES** | Sub + per-card |

**MarketFoto's structural advantage:** 990 rub/mo unlimited is the most aggressive unlimited offer in the Russian market. No competitor offers true unlimited at under 1,000 rub. This is possible because of zero marginal API costs (self-hosted rembg + Pillow, no paid API dependencies). The per-card 49 rub option also has no direct equivalent among subscription-focused competitors.

## Sources

- [WBCard pricing tiers](https://wbcard.ru/plan/) -- HIGH confidence, direct from site
- [vc.ru -- Top 10 AI services for marketplace cards 2026](https://vc.ru/services/1989270-top-10-ai-servisov-dlya-sozdaniya-kartochek-tovarov) -- MEDIUM confidence
- [Neiro-Card.AI comparison of services](https://neiro-card.ai/blog/luchshie-servisy-dlya-sozdaniya-kartochek-tovara) -- MEDIUM confidence
- [Photoroom features and batch processing 2026](https://www.photoroom.com/blog/best-batch-photo-editors) -- HIGH confidence
- [Photoroom vs Canva comparison](https://www.photoroom.com/blog/photoroom-or-canva) -- HIGH confidence
- [Photoroom background removal benchmark](https://docs.photoroom.com/resources/remove-background-competitors-benchmark-remove.bg-clipdrop-sam-azure) -- HIGH confidence
- [24AI product photo service](https://24ai.tech/ru/) -- MEDIUM confidence
- [Fabula AI](https://fabula-ai.com/) -- MEDIUM confidence
- [Wondercard](https://wondercard.ru/) -- MEDIUM confidence
- [SUPA marketplace features](https://supa.ru/features/marketplace) -- MEDIUM confidence
- [WB/Ozon photo requirements](https://reklama.tochka.com/blog/razmer-foto-dlya-kartochek-tovara-wildberries-i-ozon-trebovaniya) -- HIGH confidence
- [DTF -- Top neural networks for marketplace cards 2026](https://dtf.ru/top-raiting/4144825-top-10-nevrosetei-dlya-sozdaniya-foto-kartochek-tovarov) -- MEDIUM confidence
- [Flyvi pricing](https://flyvi.io/ru/tariffs) -- HIGH confidence
- [Habr -- WB API card upload](https://habr.com/ru/articles/897548/) -- HIGH confidence
- [Marpla A/B testing for marketplace photos](https://marpla.ru/ab_test_foto/) -- MEDIUM confidence
- [rembg vs Background Remover 2026](https://www.backgroundremover.com/blog/rembg-vs-background-remover) -- MEDIUM confidence
- [sostav.ru -- Top 15 neural networks for marketplace cards 2026](https://www.sostav.ru/blogs/287107/77411) -- MEDIUM confidence
- [GigaChat for product descriptions](https://giga.chat/help/articles/gigachat-for-product-description) -- HIGH confidence

---
*Feature landscape for: MarketFoto*
*Researched: 2026-03-30*
