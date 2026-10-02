# Task 4 Report: Extension Popup UI Markup & CSS (`popup.html` & `popup.css`)

**Date**: 2026-10-02  
**Status**: DONE  
**Commit**: `e5bee30962dfabab59c1f931a4e23f7fc86d8d68` (`feat(extension): create popup UI markup and dark theme styles`)

---

## 1. Executive Summary

Implemented the Chrome Extension popup user interface markup (`extension/popup.html`) and responsive dark theme stylesheet (`extension/popup.css`) along with a full JSDOM test suite (`tests/popup-ui.test.ts`) using strict Test-Driven Development (TDD).

The popup UI complies with all Chrome Manifest V3 security requirements:
- **0** inline `<script>` tags
- **0** inline event handler attributes (`onclick`, `onchange`, `onsubmit`, etc.)
- Exclusively loads styles via `<link rel="stylesheet" href="popup.css">` and behavior via `<script src="popup.js"></script>`
- Matches the modern dark theme aesthetic of Resume Tracker with Slate (`#0f172a`, `#1e293b`) and Indigo (`#6366f1`).

---

## 2. Views and Element Architecture

The UI architecture implements 5 distinct view containers toggled via state and `.hidden` utility classes:

### Header
- **Brand Title**: "Resume Tracker" with briefcase SVG icon.
- **Server Status Dot (`#server-status-dot`)**: Dynamic visual indicator (`.dot-online`, `.dot-offline`, `.dot-unknown`).
- **Settings Toggle (`#btn-settings`)**: Gear icon button to switch to configuration.

### 1. Loading View (`#view-loading`)
- Animated indigo loading spinner (`.loading-spinner`).
- Detected job portal badge (`#loading-portal-pill`).
- Progress description: *"Pobieram dane oferty i analizuję przez AI..."*.

### 2. Form View (`#view-form`)
- **Duplicate Detection Banner (`#duplicate-banner`)**:
  - Warning alert hidden by default.
  - Message container (`#duplicate-text`).
  - Dual action buttons: `#btn-update` (*"Zaktualizuj istniejący"*) vs `#btn-save-new` (*"Zapisz jako nowy"*).
- **Core Job Details**:
  - Role input (`#field-role`) with required flag.
  - Company input (`#field-company`) with required flag.
  - Location input (`#field-location`).
  - Salary input (`#field-salary`).
  - Work type pill selector (`#work-type-group`) with options: *Zdalnie*, *Hybrydowo*, *Biuro*.
  - Portal input (`#field-portal`).
  - Initial status selector (`#field-status`) featuring `'Do zaaplikowania'` (selected by default) and `'Wysłana'` alongside other standard lifecycle statuses.
- **Skills Management**:
  - Container for removable skill tags (`#skills-container`).
  - Input field (`#input-new-skill`) and add button (`#btn-add-skill`).
- **Notes & Archival Options**:
  - Notes / AI summary textarea (`#field-notes`).
  - Checkbox (`#chk-include-full-text`) for *"Dołącz pełną treść ogłoszenia do notatek"*.
- **Form Actions**:
  - Cancel button (`#btn-cancel`).
  - Submit button (`#btn-save`) labeled *"💾 Zapisz w Resume Tracker"*.

### 3. Success View (`#view-success`)
- Green checkmark badge with confirmation heading.
- Primary button (`#btn-open-app`) to open the Proxmox Resume Tracker web application.
- Secondary button (`#btn-close-success`) to dismiss the popup.

### 4. Settings View (`#view-settings`)
- Back button (`#btn-back-from-settings`).
- Server URL input (`#input-server-url`) defaulting to `http://localhost:3050`.
- Connection test button (`#btn-test-connection`) with dynamic status label (`#test-connection-status`).
- Optional custom Gemini API key field (`#input-custom-api-key`).
- Save configuration button (`#btn-save-settings`).

### 5. Error View (`#view-error`)
- Error badge with issue details box (`#error-message`).
- Retry button (`#btn-retry`).
- Direct navigation button to settings (`#btn-goto-settings`).

---

## 3. Styling & Dark Theme Design System (`popup.css`)

- **Sizing**: Standardized 400px width (`width: 400px; max-height: 600px;`) optimized for Chrome extension popup drawers.
- **Palette**:
  - Body background: `#0f172a` (Slate 900)
  - Card & input surfaces: `#1e293b` (Slate 800)
  - Borders: `#334155` (Slate 700)
  - Accent / Focus: `#6366f1` (Indigo 500) and `#4f46e5` (Indigo 600)
  - Status indicators: `#22c55e` (Online/Green), `#f59e0b` (Testing/Warning), `#ef4444` (Offline/Red)
- **UI Details**:
  - Focus rings with indigo glow (`box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.25)`).
  - Custom dark scrollbar (`::-webkit-scrollbar`).
  - Responsive pill toggles for work type.
  - Interactive skill chips with hover dismiss buttons.
  - Utility classes including `.hidden { display: none !important; }`.

---

## 4. TDD Verification & Test Results

### Phase 1: RED (Failing Test)
- Created `tests/popup-ui.test.ts`.
- Verified failure prior to implementation: 12/12 tests failed due to missing files.

### Phase 2: GREEN (Implementation)
- Created `extension/popup.html` and `extension/popup.css`.
- Verified passing unit tests:
  ```bash
  node ./node_modules/vitest/vitest.mjs run tests/popup-ui.test.ts
  # Result: 12 passed (12)
  ```

### Phase 3: Regression Suite & TypeScript Checks
- TypeScript typecheck (`tsc --noEmit`):
  ```bash
  node ./node_modules/typescript/bin/tsc --noEmit
  # Result: Exit code 0 (0 errors)
  ```
- Full Vitest suite:
  ```bash
  node ./node_modules/vitest/vitest.mjs run
  # Result: 19 passed (19) test files, 152 passed (152) tests
  ```

---

## 5. Git Version Control

- **Committed Files**:
  - `extension/popup.html`
  - `extension/popup.css`
  - `tests/popup-ui.test.ts`
- **Commit**: `e5bee30 feat(extension): create popup UI markup and dark theme styles`
- No remote push was executed per project rules.
