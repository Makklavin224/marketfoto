---
phase: 02-authentication-user-system
plan: 03
subsystem: frontend-auth-ux
tags: [auth, user-badge, header, protected-route, navigation-guard]
dependency_graph:
  requires: [02-01, 02-02]
  provides: [user-badge, header, protected-routes, auth-redirect]
  affects: [03-upload, 06-editor, 09-dashboard]
tech_stack:
  added: []
  patterns: [ProtectedRoute layout with Outlet, outside-click dropdown, Russian pluralization]
key_files:
  created:
    - frontend/src/components/UserBadge.tsx
    - frontend/src/components/Header.tsx
    - frontend/src/components/ProtectedRoute.tsx
  modified:
    - frontend/src/router.tsx
    - frontend/src/pages/AuthPage.tsx
decisions:
  - ProtectedRoute as layout route (pathless element with children) for automatic Header on all protected pages
  - Russian pluralization function for credits count (карточка/карточки/карточек)
  - Dropdown menu items (Мой аккаунт, Тарифы) are button placeholders until their routes exist
metrics:
  completed: "2026-03-30"
  tasks: 3
  files: 5
---

# Phase 02 Plan 03: UserBadge, Header, ProtectedRoute Summary

UserBadge component in Header with plan badge and credits, ProtectedRoute wrapper for navigation guards, router restructured with layout routes.

## One-liner

UserBadge (avatar + name + plan badge + credits + dropdown), Header, ProtectedRoute guard with layout, AuthPage redirect-if-authenticated.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | UserBadge, Header, ProtectedRoute components | 322f6d2 | UserBadge.tsx, Header.tsx, ProtectedRoute.tsx |
| 2 | Wire ProtectedRoute into router, AuthPage redirect | 695ea40 | router.tsx, AuthPage.tsx |
| 3 | Verify complete auth flow (checkpoint) | auto-approved | -- |

## Key Implementation Details

- **UserBadge**: Avatar circle with initial letter, user name/email, plan badge with color variants (free=gray, starter=blue, business=purple), "Осталось N карточек" with Russian pluralization, dropdown with Мой аккаунт / Тарифы / Выйти, outside-click close via useRef + mousedown
- **Header**: Fixed 64px height, MarketFoto logo left, UserBadge right, bottom border
- **ProtectedRoute**: Layout route (no path) wrapping /editor and /dashboard as children; renders Header + Outlet when authenticated, Navigate to /auth when not, loading spinner during initialization
- **Router restructured**: /auth and / are public routes outside layout; /editor and /dashboard are children of ProtectedRoute layout
- **AuthPage redirect**: useEffect checks token and navigates to /editor if already authenticated

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed noUncheckedIndexedAccess TypeScript error in UserBadge**
- **Found during:** Task 1
- **Issue:** `planLabels[user.plan]` returns `T | undefined` with `noUncheckedIndexedAccess: true`
- **Fix:** Used inline default object with nullish coalescing operator
- **Files modified:** frontend/src/components/UserBadge.tsx
- **Commit:** 322f6d2

## Requirements Coverage

- UI-02: UserBadge in Header shows avatar + name + plan badge (Бесплатный/Стартер/Бизнес) + "Осталось N карточек" + dropdown (Мой аккаунт, Тарифы, Выйти)

## Known Stubs

- "Мой аккаунт" dropdown button is a placeholder (no route yet -- will be in future phase)
- "Тарифы" dropdown button is a placeholder (routes to /pricing in Phase 8)
- /editor and /dashboard render placeholder text (built in Phase 6 and 9 respectively)
