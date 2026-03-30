# Requirements: MarketFoto

**Defined:** 2026-03-30
**Core Value:** Продавец загружает фото с телефона и получает готовую карточку с инфографикой в правильном формате маркетплейса — быстрее, дешевле и проще любой альтернативы.

## v1 Requirements

Requirements for MVP release. Each maps to roadmap phases.

### Infrastructure

- [ ] **INFRA-01**: Docker Compose с 7 сервисами (backend, worker, frontend, postgres, redis, minio, nginx) запускается одной командой
- [ ] **INFRA-02**: MinIO настроен с 3 бакетами (originals, processed, rendered) и lifecycle policies
- [x] **INFRA-03**: PostgreSQL 16 инициализируется с полной SQL-схемой (users, images, templates, renders, payments)
- [ ] **INFRA-04**: Redis доступен для RQ очереди и кэша
- [ ] **INFRA-05**: Nginx reverse proxy маршрутизирует /api → backend, / → frontend
- [ ] **INFRA-06**: Docker memory limits для rembg worker (max 2GB per worker) предотвращают OOM на shared VPS
- [ ] **INFRA-07**: .env файл с всеми переменными окружения (DB, Redis, MinIO, JWT, YooKassa, CORS)
- [x] **INFRA-08**: Health check эндпоинт (/api/health) проверяет все зависимости (DB, Redis, MinIO)

### Authentication

- [x] **AUTH-01**: Пользователь может зарегистрироваться по email и паролю (bcrypt/argon2, min 6 символов)
- [x] **AUTH-02**: Пользователь может войти по email и паролю, получая JWT токен (7 дней, HS256)
- [x] **AUTH-03**: Пользователь может запросить сброс пароля через email
- [x] **AUTH-04**: JWT-защищённые эндпоинты возвращают 401 при expired/invalid токене
- [x] **AUTH-05**: GET /api/auth/me возвращает профиль пользователя (plan, credits_remaining, subscription_expires_at)
- [x] **AUTH-06**: При регистрации: plan='free', credits_remaining=3, credits_reset_at=now+30 дней
- [x] **AUTH-07**: SQL injection и XSS предотвращены (parameterized queries, input validation)

### Upload & Processing

- [x] **UPLD-01**: Пользователь может загрузить фото (JPG/PNG/WebP, до 10MB, min 200x200, max 8000x8000)
- [x] **UPLD-02**: Файл валидируется по magic bytes (не только по расширению)
- [x] **UPLD-03**: Файл сохраняется в MinIO через presigned URL (originals/{user_id}/{image_id}.{ext})
- [x] **UPLD-04**: При загрузке проверяется credits_remaining (403 если 0)
- [x] **UPLD-05**: Пользователь может запустить удаление фона (POST /api/images/{id}/remove-background)
- [x] **UPLD-06**: Удаление фона выполняется async через RQ worker с rembg (birefnet-general модель)
- [x] **UPLD-07**: Обработанное изображение (PNG с alpha) сохраняется в MinIO (processed/{user_id}/{image_id}.png)
- [x] **UPLD-08**: Пользователь может опрашивать статус обработки (GET /api/images/{id}/status, каждые 2 сек)
- [x] **UPLD-09**: Processing timeout 30 секунд → status='failed', error_message='Timeout'
- [x] **UPLD-10**: Изображение > 4000px по большей стороне автоматически ресайзится перед обработкой
- [x] **UPLD-11**: Повторный remove-background для processing image возвращает 409
- [x] **UPLD-12**: rembg worker использует session reuse и переработку для предотвращения memory leak

### Templates & Editor

- [x] **TMPL-01**: GET /api/templates возвращает список шаблонов с фильтрацией по category и marketplace
- [x] **TMPL-02**: 5 seed-шаблонов загружены в БД (clean-white, info-features, lifestyle-shadow, info-badge-hit, collage-two)
- [x] **TMPL-03**: Каждый шаблон имеет JSON config (background, product_area, text_areas, decorations)
- [x] **TMPL-04**: Premium шаблоны (collage-two) недоступны для free-плана (403 с предложением upgrade)
- [ ] **EDIT-01**: Canvas-редактор на fabric.js: фото товара draggable и resizable на шаблоне
- [ ] **EDIT-02**: Текстовые области из шаблона кликабельны с inline-editing
- [ ] **EDIT-03**: Бейджи/декорации включаются/выключаются toggle
- [ ] **EDIT-04**: Выбор маркетплейса (WB/Ozon/ЯМ) переключает размеры canvas
- [ ] **EDIT-05**: Правая панель: секции Маркетплейс, Тексты, Стиль (fontSize/color/bold), Бейдж
- [ ] **EDIT-06**: Zoom +/- кнопки для canvas

### Rendering & Export

- [x] **RNDR-01**: POST /api/renders принимает image_id + template_id + overlay_data + marketplace
- [x] **RNDR-02**: Бэкенд рендерит финальную карточку через Pillow (background + product + text + decorations)
- [x] **RNDR-03**: Рендер ресайзится до размеров маркетплейса: WB 900x1200, Ozon 1200x1200, ЯМ 800x800
- [x] **RNDR-04**: Готовая карточка сохраняется в MinIO (rendered/{user_id}/{render_id}.png)
- [x] **RNDR-05**: При рендере вычитается 1 credit (credits_remaining -= 1, atomic UPDATE)
- [x] **RNDR-06**: Free-план: watermark "MarketFoto.ru" (opacity 0.3, 10% ширины) в правом нижнем углу
- [x] **RNDR-07**: Пользователь может скачать карточку (PNG или JPG) по signed URL (expires 1h)
- [x] **RNDR-08**: GET /api/renders возвращает историю с пагинацией (limit, offset, sort)
- [x] **RNDR-09**: DELETE /api/renders/{id} удаляет рендер и файл из MinIO
- [x] **RNDR-10**: Кредиты вычитаются атомарно (UPDATE WHERE credits_remaining > 0) до постановки в очередь

### Payments

- [x] **PAY-01**: POST /api/payments/create создаёт платёж в YooKassa (subscription или one_time)
- [x] **PAY-02**: Поддержка 6 вариантов: starter (49900 коп), business (99000), starter_annual (399000), business_annual (790000), one_time (4900)
- [x] **PAY-03**: YooKassa возвращает confirmation_url → фронт редиректит пользователя
- [x] **PAY-04**: POST /api/payments/webhook обрабатывает YooKassa notifications с идемпотентностью по payment_id
- [x] **PAY-05**: Webhook проверяет IP из белого списка YooKassa
- [x] **PAY-06**: При payment.succeeded: обновляет plan, credits_remaining, subscription_expires_at
- [x] **PAY-07**: one_time покупка: credits_remaining += 1 (не меняет план)
- [x] **PAY-08**: GET /api/payments/history возвращает историю платежей пользователя
- [x] **PAY-09**: POST /api/payments/cancel-subscription отменяет auto-renewal (план действует до expires_at)
- [x] **PAY-10**: Cron job ежедневно: если subscription_expires_at < now и нет autopay → plan='free', credits=3

### Landing Page

- [ ] **LAND-01**: Hero-секция: заголовок + подзаголовок + CTA "Попробовать бесплатно" + до/после slider
- [ ] **LAND-02**: Секция "Как это работает" (3 шага с иконками)
- [ ] **LAND-03**: Секция "До / После" (3-4 примера: одежда, электроника, косметика, еда)
- [ ] **LAND-04**: Секция "Для какого маркетплейса" (логотипы WB, Ozon, ЯМ)
- [ ] **LAND-05**: Секция "Тарифы" (3 карточки + toggle месяц/год + разовая покупка)
- [ ] **LAND-06**: Секция "FAQ" (accordion, 5-7 вопросов)
- [ ] **LAND-07**: Footer (О сервисе, Тарифы, Поддержка, Политика конфиденциальности)
- [ ] **LAND-08**: SEO: title, description, OG-tags для MarketFoto
- [ ] **LAND-09**: Mobile-first responsive (breakpoints 640/768/1024/1280)
- [ ] **LAND-10**: LCP < 3 секунд, lazy-load изображений

### Dashboard

- [ ] **DASH-01**: GET /api/dashboard/stats возвращает план, кредиты, рендеры за месяц, всего, expires_at
- [ ] **DASH-02**: Сетка созданных карточек (4 колонки desktop, 2 mobile) с thumbnail + marketplace badge + дата
- [ ] **DASH-03**: Каждая карточка: кнопки скачать (PNG/JPG) и удалить
- [ ] **DASH-04**: Пагинация (load more)
- [ ] **DASH-05**: Пустое состояние: "Вы ещё не создали карточек" + кнопка "Создать первую"

### UI Components

- [x] **UI-01**: AuthPage (/auth): табы Вход/Регистрация, валидация полей, loading/error/success states
- [x] **UI-02**: UserBadge в Header: аватар + имя + план + "Осталось N карточек" + dropdown menu
- [x] **UI-03**: ImageUpload: drag & drop зона, file picker, прогресс-бар, preview, шахматный фон для прозрачности
- [x] **UI-04**: BackgroundPreview: оригинал слева, обработанное справа, кнопка "Далее"
- [x] **UI-05**: TemplateSelector: табы-фильтры по категориям, чипы по маркетплейсу, сетка 3 колонки, замок на premium
- [x] **UI-06**: ExportPanel: превью, информация о размере, кнопки скачать PNG/JPG, "Создать ещё"
- [x] **UI-07**: PricingPage (/pricing): 3 карточки + toggle месяц/год + блок разовой покупки
- [x] **UI-08**: PaymentSuccess (/payment/success): галочка + новый план + кнопка "Создать карточку"
- [x] **UI-09**: PaymentModal: "Закончились карточки" + варианты подписки/разовой покупки
- [ ] **UI-10**: 15-20 Cyrillic fonts bundled (Montserrat, Inter, Golos, Rubik, Nunito и др.)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Batch & Productivity

- **BATCH-01**: Пакетная загрузка до 20 фото одновременно (Business plan)
- **BATCH-02**: Multi-slide per product (5-7 слайдов для одного товара)

### AI & Smart Features

- **AI-01**: AI-генерация текста для карточки через YandexGPT ("опиши товар для WB")
- **AI-02**: Niche-specific template auto-suggestion по фото товара

### Growth & Social

- **GROW-01**: Реферальная программа (бесплатная карточка за приглашение)
- **GROW-02**: 45+ дополнительных шаблонов (до 50+ total)

### Integrations

- **INTG-01**: OAuth вход (VK, Yandex)
- **INTG-02**: API для интеграции с CMS/1C
- **INTG-03**: Прямая загрузка карточек на маркетплейс через API

### Team & Enterprise

- **TEAM-01**: Командные аккаунты с ролями
- **TEAM-02**: Расширенная аналитика (какие шаблоны конвертируют лучше)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Мобильное приложение | Web-first, responsive достаточно для MVP |
| Real-time collaborative editing | Overkill для single-user product card creation |
| AI background replacement (сцены) | Сложность, не table stakes, Phase 3+ |
| Video карточки | Storage/bandwidth costs, другой pipeline |
| Marketplace API интеграция (upload) | Требует партнёрские API, Phase 3 |
| Кастомные шаблоны от пользователей | Сложный UX, Phase 3+ |
| Multilingual UI | Только русский для RU-рынка |
| 54-FZ фискальные чеки | Самозанятый не обязан, добавить при масштабировании |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Complete |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 1 | Pending |
| INFRA-07 | Phase 1 | Pending |
| INFRA-08 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UPLD-01 | Phase 3 | Complete |
| UPLD-02 | Phase 3 | Complete |
| UPLD-03 | Phase 3 | Complete |
| UPLD-04 | Phase 3 | Complete |
| UPLD-10 | Phase 3 | Complete |
| UPLD-11 | Phase 3 | Complete |
| UI-03 | Phase 3 | Complete |
| UPLD-05 | Phase 4 | Complete |
| UPLD-06 | Phase 4 | Complete |
| UPLD-07 | Phase 4 | Complete |
| UPLD-08 | Phase 4 | Complete |
| UPLD-09 | Phase 4 | Complete |
| UPLD-12 | Phase 4 | Complete |
| UI-04 | Phase 4 | Complete |
| TMPL-01 | Phase 5 | Complete |
| TMPL-02 | Phase 5 | Complete |
| TMPL-03 | Phase 5 | Complete |
| TMPL-04 | Phase 5 | Complete |
| UI-05 | Phase 5 | Complete |
| EDIT-01 | Phase 6 | Pending |
| EDIT-02 | Phase 6 | Pending |
| EDIT-03 | Phase 6 | Pending |
| EDIT-04 | Phase 6 | Pending |
| EDIT-05 | Phase 6 | Pending |
| EDIT-06 | Phase 6 | Pending |
| UI-10 | Phase 6 | Pending |
| RNDR-01 | Phase 7 | Complete |
| RNDR-02 | Phase 7 | Complete |
| RNDR-03 | Phase 7 | Complete |
| RNDR-04 | Phase 7 | Complete |
| RNDR-05 | Phase 7 | Complete |
| RNDR-06 | Phase 7 | Complete |
| RNDR-07 | Phase 7 | Complete |
| RNDR-08 | Phase 7 | Complete |
| RNDR-09 | Phase 7 | Complete |
| RNDR-10 | Phase 7 | Complete |
| UI-06 | Phase 7 | Complete |
| PAY-01 | Phase 8 | Complete |
| PAY-02 | Phase 8 | Complete |
| PAY-03 | Phase 8 | Complete |
| PAY-04 | Phase 8 | Complete |
| PAY-05 | Phase 8 | Complete |
| PAY-06 | Phase 8 | Complete |
| PAY-07 | Phase 8 | Complete |
| PAY-08 | Phase 8 | Complete |
| PAY-09 | Phase 8 | Complete |
| PAY-10 | Phase 8 | Complete |
| UI-07 | Phase 8 | Complete |
| UI-08 | Phase 8 | Complete |
| UI-09 | Phase 8 | Complete |
| DASH-01 | Phase 9 | Pending |
| DASH-02 | Phase 9 | Pending |
| DASH-03 | Phase 9 | Pending |
| DASH-04 | Phase 9 | Pending |
| DASH-05 | Phase 9 | Pending |
| LAND-01 | Phase 10 | Pending |
| LAND-02 | Phase 10 | Pending |
| LAND-03 | Phase 10 | Pending |
| LAND-04 | Phase 10 | Pending |
| LAND-05 | Phase 10 | Pending |
| LAND-06 | Phase 10 | Pending |
| LAND-07 | Phase 10 | Pending |
| LAND-08 | Phase 10 | Pending |
| LAND-09 | Phase 10 | Pending |
| LAND-10 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 82 total
- Mapped to phases: 82
- Unmapped: 0

---
*Requirements defined: 2026-03-30*
*Last updated: 2026-03-30 after roadmap creation*
