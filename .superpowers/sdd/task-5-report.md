# Task 5 Report: Extension Popup Controller (`popup.js`) & Duplicate Detection

## Summary
Successfully implemented the complete Chrome Extension Popup controller (`extension/popup.js`), its integration with `popup.html`, duplicate detection logic, backend communication (`/api/health`, `/api/applications`, `/api/jobs/parse-job`), interactive skill chips, work type pills, offline and error handling, and settings management. Tested thoroughly with Vitest in JSDOM and validated against strict TypeScript type checking (`tsc --noEmit`).

## Key Implementations & Features
1. **Helper Functions & Core Logic (`extension/popup.js`)**:
   - `normalizeUrl(url)`: Strips tracking parameters (`utm_*`, `gad_*`, `fbclid`, `gclid`, etc.), trailing slashes, and normalizes protocol and hostname.
   - `findDuplicate(applications, currentJob)`: Identifies existing duplicate applications by either matching exact normalized URLs or case-insensitive trimmed `company` + `role`.
   - `testServerHealth(serverUrl)`: Checks `GET /api/health` and provides connectivity status.
   - `parseJobDetails(serverUrl, extractedData, customApiKey)`: Sends extracted offer content to `POST /api/jobs/parse-job` with optional custom Gemini API key.
   - `saveApplication(serverUrl, applicationData)`: Persists application via `POST /api/applications` with default status 'Do zaaplikowania', skill tags, and timeline entry.
   - `updateApplication(serverUrl, id, applicationData)`: Updates existing duplicate record via `PUT /api/applications/:id`.
   - `initPopup()`: Orchestrates view transitions, active tab checks, extractor script injection, data fetching, form population, and duplicate warnings.

2. **UI & UX Workflows**:
   - **View Panel Transitions**: Seamlessly switches between `loading`, `form`, `success`, `settings`, and `error` views using the `.hidden` utility class.
   - **Restricted URL Guard**: Detects internal browser URLs (`chrome://`, `chrome-extension://`, `edge://`, `about:`, etc.) and informs the user to open a job listing.
   - **Interactive Skill Chips**: Supports dynamic deletion (`×` button) and addition via text input or Enter key.
   - **Work Type Pills**: Automatically detects "Zdalnie", "Hybrydowo", or "Biuro" from job descriptions and allows interactive selection.
   - **Duplicate Alert Banner**: Displays existing status and application date when a duplicate is found, offering buttons to either update the existing application or save as new.
   - **Full Text Checkbox**: Appends raw job text to notes when `#chk-include-full-text` is checked.
   - **Connection Settings & Status Dot**: Allows configuring `serverUrl` (defaults to `http://localhost:3050`) and Gemini API key with live connection testing and status dot updates (`dot-online`, `dot-offline`, `dot-unknown`).
   - **Offline / Error Handling**: Catches network failures, displays clear error guidance, and enables retry or direct navigation to settings.

3. **Security & MV3 Compliance**:
   - Strict Manifest V3 compatibility.
   - Zero `eval()`, zero `new Function()`, zero inline scripts.
   - All asynchronous logic implemented with `async/await` (no `.then()` chains).

## Verification & Test Results
- **Unit & Integration Tests (`tests/popup-controller.test.ts`)**:
  - 20/20 test cases passed (covering helper functions, normal extraction & save, duplicate detection with update/save-new, restricted URLs, network errors, skill chips, work type pills, and settings).
- **Full Test Suite**:
  - 20 test files passed, 172 tests passed (including `tests/extractor.test.ts`, `tests/popup-ui.test.ts`, `tests/extension-manifest.test.ts`, and backend routes).
- **Type Checking**:
  - `tsc --noEmit` completed with 0 errors.

## Git Commits
- Commit: `f8b46137772e6c29c215d26e3942e29c44936d66`
- Message: `feat(extension): implement popup controller, API communication and duplicate resolution`
- Staged and committed files:
  - `extension/popup.js`
  - `extension/popup.html`
  - `tests/popup-controller.test.ts`
