---
phase: 03-upload-pipeline
plan: 02
subsystem: frontend/upload
tags: [upload-ui, drag-and-drop, react-dropzone, progress-bar, image-preview]
dependency_graph:
  requires: [02-02, 03-01]
  provides: [image-upload-component, upload-page, images-api-client]
  affects: [04-bg-removal, 06-canvas-editor]
tech_stack:
  added: [react-dropzone]
  patterns: [useDropzone-hook, client-side-validation, axios-progress-tracking]
key_files:
  created:
    - frontend/src/components/ImageUpload.tsx
    - frontend/src/pages/UploadPage.tsx
  modified:
    - frontend/src/lib/api.ts
    - frontend/src/router.tsx
    - frontend/package.json
decisions:
  - Used react-dropzone useDropzone hook (not raw drag events) for browser-compatible drag-and-drop
  - Client-side dimension check via Image() object before upload to avoid wasting bandwidth
  - Checkerboard CSS pattern for transparency preview (repeating-conic-gradient)
metrics:
  duration: 2min
  completed: "2026-03-30T13:06:00Z"
  tasks_completed: 2
  tasks_total: 2
requirements_covered: [UI-03]
---

# Phase 03 Plan 02: Frontend Upload UI Summary

ImageUpload component with react-dropzone drag-and-drop, client-side validation (format + size + dimensions), progress bar, checkerboard preview, error states with retry, and credits gating.

## What Was Built

### Images API Client (extended `frontend/src/lib/api.ts`)
- `ImageRecord` interface matching all backend Image model fields
- `ImageStatusResponse` interface for polling endpoint
- `imagesApi.upload()` with `onUploadProgress` callback for progress bar
- `imagesApi.get()`, `imagesApi.getStatus()`, `imagesApi.delete()`

### ImageUpload Component (`frontend/src/components/ImageUpload.tsx`)
- **Idle state:** Dashed border drop zone with cloud upload icon, "Перетащите фото товара сюда или нажмите для выбора", format hint
- **Uploading state:** Spinner animation, progress bar (0-100%), percentage text
- **Uploaded state:** Image preview on checkerboard background (transparency), filename + dimensions + size, "Далее: убрать фон" button, delete button
- **Error state:** Red warning icon, error message, "Попробовать снова" link
- **No credits state:** Disabled zone with "Нет доступных карточек", link to /pricing
- Client-side validation: format (accept config), size (maxSize 10MB), dimensions (Image() check >= 200x200)
- `onUploadComplete` callback prop for parent integration

### UploadPage (`frontend/src/pages/UploadPage.tsx`)
- Header with "Загрузка фото" title and credits counter
- Centered ImageUpload component in max-w-2xl container

### Route Wiring (`frontend/src/router.tsx`)
- `/upload` route added inside ProtectedRoute children (requires auth)

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Images API, ImageUpload component, UploadPage, route | 7529cdf | api.ts, ImageUpload.tsx, UploadPage.tsx, router.tsx, package.json |
| 2 | Checkpoint: auto-approved | -- | -- |

## Deviations from Plan

None -- plan executed exactly as written.

## Requirements Coverage

| Requirement | Implementation |
|-------------|---------------|
| UI-03 | ImageUpload component with drag-and-drop zone, file picker, progress bar, preview with checkerboard transparency, all 4 states (idle/uploading/uploaded/error) |

## Known Stubs

- "Далее: убрать фон" button logs to console -- Phase 4 will wire navigation to background removal flow
- /pricing link in no-credits state is a placeholder -- Phase 8 (Payments) will create the pricing page

## Self-Check: PASSED
