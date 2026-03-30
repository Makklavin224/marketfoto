# MarketFoto

## What This Is

Веб-сервис, превращающий фото товара с телефона в готовую карточку для маркетплейсов (WB, Ozon, Яндекс.Маркет) за 30 секунд. AI убирает фон (rembg), пользователь выбирает шаблон с инфографикой, добавляет текст через canvas-редактор, и скачивает карточку в правильных размерах. Для мелких продавцов на маркетплейсах, которым нужны профессиональные фото без бюджета на фотографа.

## Core Value

Продавец загружает фото с телефона и получает готовую карточку с инфографикой в правильном формате маркетплейса — быстрее, дешевле и проще любой альтернативы.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Регистрация и авторизация по email/password с JWT
- [ ] Загрузка фото (JPG/PNG/WebP, до 10MB) с валидацией
- [ ] Удаление фона через rembg (async worker, Redis queue)
- [ ] 5 шаблонов карточек (white_bg, infographic x2, lifestyle, collage)
- [ ] Canvas-редактор: перемещение фото, текстовые области, бейджи
- [ ] Рендер финальной карточки на бэкенде (Pillow)
- [ ] Экспорт в размерах WB (900x1200), Ozon (1200x1200), ЯМ (800x800)
- [ ] Оплата через YooKassa: подписки (Starter 499₽, Business 990₽) и разовая (49₽)
- [ ] Webhook обработка YooKassa с идемпотентностью
- [ ] Водяной знак для бесплатного плана
- [ ] Лендинг: hero, до/после, шаги, тарифы, FAQ
- [ ] Дашборд: история карточек, статистика, скачивание
- [ ] Кредитная система: 3 free/мес, 50 starter, безлимит business
- [ ] Docker Compose инфраструктура (backend, worker, frontend, postgres, redis, minio, nginx)

### Out of Scope

- Пакетная загрузка (до 20 фото) — Phase 2
- AI-генерация текста (YandexGPT) — Phase 2
- OAuth (VK/Yandex) — Phase 3
- API-доступ для интеграции с CMS/1C — Phase 3
- Мобильное приложение — web-first, responsive достаточно
- Командные аккаунты — Phase 3
- Расширенная аналитика — Phase 3
- Реферальная программа — Phase 2

## Context

- Автор: опыт с Python FastAPI (Signal Digest AI, МастерПлатформа), React 19 (МастерПлатформа)
- VPS уже есть: 64.188.115.254 (используется для других проектов)
- Домен: marketfoto.ru (нужно зарегистрировать)
- Тайминг: Ozon повышает комиссии до 50-55% с 6 апреля 2026 — продавцы в панике, окно возможности
- Конкуренты: Photoroom ($9.99/мес, нет WB/Ozon), Canva (медленно), Remove.bg (только фон), фрилансеры (дорого)
- rembg: open-source, U2NET модель, ~2-5 сек на CPU, бесплатно
- Unit-экономика: себестоимость ~0.5₽/фото, маржа 90-95%
- Целевой рынок: 880K мелких продавцов + 200K SMM + 150K дропшипперов

## Constraints

- **Stack**: Python 3.12 + FastAPI (бэкенд), React 19 + Vite + TailwindCSS 4 (фронтенд) — опыт разработчика, natively поддерживает rembg/Pillow
- **Infrastructure**: Docker Compose на VPS (64.188.115.254) — уже используется для других проектов
- **Storage**: MinIO (S3-compatible) — self-hosted, без затрат на облачный S3
- **Payments**: YooKassa — единственный адекватный вариант для RU-рынка, 3% комиссия
- **ML**: rembg (open-source) — бесплатно, работает локально, не нужен платный API
- **Timeline**: MVP за 7-10 дней — окно Ozon комиссий
- **Budget**: Минимальный — VPS уже есть, все компоненты open-source/бесплатные

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| rembg вместо remove.bg API | Бесплатно, self-hosted, достаточное качество для товарных фото | — Pending |
| Pillow для рендера (не canvas на фронте) | Гарантированное качество, не зависит от браузера, можно добавить watermark | — Pending |
| Redis RQ для очереди (не Celery) | Проще, легче, достаточно для MVP. Celery overkill | — Pending |
| MinIO вместо облачного S3 | Self-hosted, бесплатно, S3-compatible API | — Pending |
| JWT stateless (не sessions) | Простота, масштабируемость, опыт | — Pending |
| fabric.js для canvas-редактора | Зрелая библиотека, drag & drop, resize, text editing из коробки | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
