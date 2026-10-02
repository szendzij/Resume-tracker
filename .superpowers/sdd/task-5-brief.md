# Task 5 Brief: Extension Popup Controller (`popup.js`) & Duplicate Detection

## Global Constraints
- Manifest version 3.
- All icon files declared in manifest exist on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- All code in `popup.js` uses async/await (no `.then()` chains).
- Server must return Access-Control-Allow-Private-Network: true on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend returns heuristic job data and the extension must allow saving.
- Never run git push without direct, explicit user request.
- Git commits and staging are pre-approved and do not require user confirmation.

## Task Details
**Files:**
- Create: `extension/popup.js`
- Test: `tests/popup-controller.test.ts`

**Interfaces:**
- Consumes:
  - Elements defined in `popup.html` (`#server-status-dot`, `#btn-settings`, `#btn-back`, `#duplicate-banner`, `#field-role`, `#field-company`, `#field-location`, `#field-salary`, `#field-portal`, `#field-status`, `#skills-container`, `#field-notes`, `#chk-include-full-text`, `#btn-save`, `#btn-update`, `#btn-save-new`, `#btn-test-connection`, `#input-server-url`, `#input-custom-api-key`, `#test-connection-status`, `#view-loading`, `#view-form`, `#view-success`, `#view-settings`, `#view-error`, etc.)
  - Chrome APIs: `chrome.tabs`, `chrome.scripting`, `chrome.storage.sync` (or fallback mock)
  - Backend API: `serverUrl` defaulting to `http://localhost:3050`
- Produces:
  - `extension/popup.js`:
    - Handles initialization on DOMContentLoaded.
    - Manages state: views ('loading', 'form', 'success', 'settings', 'error').
    - Checks tab URL: if starts with `chrome://`, `chrome-extension://`, `edge://`, `about:`, transitions to `#view-error` with clear message: "Wtyczka działa na stronach z ofertami pracy. Otwórz kartę z ogłoszeniem (np. Pracuj.pl, LinkedIn, Just Join IT).".
    - Injects `extractor.js` via `chrome.scripting.executeScript`.
    - Normalizes URL and performs duplicate check via `GET ${serverUrl}/api/applications` (matches either exact URL or case-insensitive company + role).
    - Calls `POST ${serverUrl}/api/jobs/parse-job` with `{ url, linkTitle, rawText }`.
    - Populates form fields with parsed results.
    - Interactive skill chips (clicking `×` removes tag; typing in `#input-new-skill` and clicking `#btn-add-skill` or pressing Enter adds tag).
    - Work type pills selection (Zdalnie / Hybrydowo / Biuro).
    - If duplicate found: shows `#duplicate-banner` with text: "⚠️ Oferta już w bazie: [Status] z dnia [Data]".
      - Clicking `#btn-update`: calls `PUT ${serverUrl}/api/applications/${matchedApp.id}` with updated fields.
      - Clicking `#btn-save-new` or `#btn-save`: calls `POST ${serverUrl}/api/applications`.
    - Handles save: builds `JobApplication` with status (defaulting to 'Do zaaplikowania' or chosen), timeline entry `[{ id: ..., status, date: ..., note: 'Zapisano przez wtyczkę Chrome' }]`, and saves to server.
    - If `#chk-include-full-text` is checked, appends `\n\n--- Pełna treść ogłoszenia ---\n` + rawText to notes.
    - On success: transitions to `#view-success`, sets `#btn-open-app` href to `${serverUrl}`.
    - Settings panel: saves `serverUrl` and `customApiKey` to `chrome.storage.sync`.
    - Connection test: calls `GET ${serverUrl}/api/health`, updates `#server-status-dot` (online: green, offline: red) and displays message.
    - Offline error handling: if `fetch` throws error, transitions to `#view-error`, retains extracted data in memory so user can click "Spróbuj ponownie" or change server settings.
  - Test: `tests/popup-controller.test.ts` verifying all state transitions, duplicate detection, API calls, error views, and settings.

**Step 1: Write the failing test**
Create `tests/popup-controller.test.ts` in JSDOM:
- Set up mock `chrome` object with `tabs`, `scripting`, `storage.sync`.
- Mock global `fetch`.
- Test normal parsing and saving flow.
- Test duplicate detection with dual buttons.
- Test server settings change and connection test.
- Test restricted URL handling (`chrome://`).
- Test offline network error handling.

**Step 2: Run test to verify it fails**
Run: `node ./node_modules/vitest/vitest.mjs run tests/popup-controller.test.ts`
Expected: FAIL (`popup.js` does not exist).

**Step 3: Implement `extension/popup.js`**
Write clean, modular code with exported helper functions (for unit testability):
- `normalizeUrl(url)`
- `findDuplicate(applications, currentJob)`
- `testServerHealth(serverUrl)`
- `parseJobDetails(serverUrl, extractedData, customApiKey)`
- `saveApplication(serverUrl, applicationData)`
- `updateApplication(serverUrl, id, applicationData)`
- `initPopup()`

**Step 4: Run test to verify it passes**
Run: `node ./node_modules/vitest/vitest.mjs run tests/popup-controller.test.ts`
Run full test suite: `node ./node_modules/vitest/vitest.mjs run`
Run TypeScript check: `node ./node_modules/typescript/bin/tsc --noEmit`

**Step 5: Commit**
`git add extension/popup.js tests/popup-controller.test.ts`
`git commit -m "feat(extension): implement popup controller, API communication and duplicate resolution"`
