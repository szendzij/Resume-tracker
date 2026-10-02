# Task 4 Brief: Extension Popup UI Markup & CSS (`popup.html` & `popup.css`)

## Global Constraints
- Manifest version 3.
- All icon files declared in manifest exist on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- All styles via `popup.css`, all scripts via `<script src="popup.js"></script>` without inline script tags or inline event handlers (`onclick` etc.).
- Asynchronous Chrome APIs must use async/await.
- Server must return Access-Control-Allow-Private-Network: true on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend must return heuristic job data and the extension must allow saving.
- Never run git push without direct, explicit user request.
- Git commits and staging are pre-approved and do not require user confirmation.

## Task Details
**Files:**
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Test: `tests/popup-ui.test.ts`

**Interfaces:**
- Consumes: Static HTML5 & CSS3
- Produces:
  - 4 view containers (with CSS visibility/hidden classes):
    - `#view-loading`: Loading spinner, portal pill `#loading-portal-pill`, loading text.
    - `#view-form`: The main review & edit form.
    - `#view-success`: Success checkmark, `#btn-open-app` link to open Resume Tracker, `#btn-close-success`.
    - `#view-settings`: Server URL input `#input-server-url`, `#btn-test-connection`, connection test result `#test-connection-status`, `#input-custom-api-key`, `#btn-save-settings`, `#btn-back-from-settings`.
    - `#view-error`: Network / tab error view with `#error-message`, `#btn-retry`, `#btn-goto-settings`.
  - Header with:
    - Title / Logo "Resume Tracker"
    - Server status dot `#server-status-dot`
    - Settings button `#btn-settings`
  - Form controls inside `#view-form`:
    - Duplicate warning banner `#duplicate-banner` (hidden by default) with duplicate message `#duplicate-text` and `#btn-update` vs `#btn-save-new`
    - Role input `#field-role`
    - Company input `#field-company`
    - Location input `#field-location`
    - Work type pills container `#work-type-group` (Zdalnie / Hybrydowo / Biuro)
    - Salary input `#field-salary`
    - Portal input/dropdown `#field-portal`
    - Status selection `#field-status` (including `'Do zaaplikowania'` [checked by default] and `'Wysłana'`)
    - Skills container `#skills-container` with input `#input-new-skill` and button `#btn-add-skill`
    - Notes textarea `#field-notes`
    - Checkbox `#chk-include-full-text` ("Dołącz pełną treść ogłoszenia do notatek")
    - Footer with `#btn-cancel` and `#btn-save` ("💾 Zapisz w Resume Tracker")

**Step 1: Write the failing test**
Create `tests/popup-ui.test.ts` using Vitest in JSDOM:
- Read `extension/popup.html`.
- Parse with DOMParser / JSDOM.
- Verify presence of view containers (`#view-loading`, `#view-form`, `#view-success`, `#view-settings`, `#view-error`).
- Verify all required form element IDs exist (`#field-role`, `#field-company`, `#field-location`, `#field-salary`, `#field-portal`, `#field-status`, `#skills-container`, `#field-notes`, `#chk-include-full-text`, `#btn-save`).
- Verify status selector options include `'Do zaaplikowania'` and `'Wysłana'`.
- Verify `#duplicate-banner` exists.
- Verify `popup.html` references external `popup.css` and `popup.js`, with NO inline `<script>` or inline `onclick` handlers.
- Verify `extension/popup.css` exists, has dark theme background `#0f172a` / `#1e293b`, accent `#6366f1`, and responsive sizing (width around 400px).

**Step 2: Run test to verify it fails**
Run: `node ./node_modules/vitest/vitest.mjs run tests/popup-ui.test.ts`
Expected: FAIL (`popup.html` does not exist).

**Step 3: Implement `popup.html` and `popup.css`**
- Write `extension/popup.html`:
  - Modern, accessible HTML structure with SVG icons for status dot, gear, checkmark, warning.
- Write `extension/popup.css`:
  - Sleek dark theme matching Resume Tracker.
  - Custom scrollbars, badges, clean form inputs, focus rings, buttons, animations.

**Step 4: Run test to verify it passes**
Run: `node ./node_modules/vitest/vitest.mjs run tests/popup-ui.test.ts`
Run full test suite: `node ./node_modules/vitest/vitest.mjs run`
Run TypeScript check: `node ./node_modules/typescript/bin/tsc --noEmit`

**Step 5: Commit**
`git add extension/popup.html extension/popup.css tests/popup-ui.test.ts`
`git commit -m "feat(extension): create popup UI markup and dark theme styles"`
