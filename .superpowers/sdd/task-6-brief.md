# Task 6 Brief: Full Integration Testing, Build Verification & Quality Gate

## Global Constraints
- Manifest version 3.
- All icon files declared in manifest exist on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- Asynchronous Chrome APIs must use async/await.
- Server must return Access-Control-Allow-Private-Network: true on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend returns heuristic job data and the extension must allow saving.
- Never run git push without direct, explicit user request.
- Git commits and staging are pre-approved and do not require user confirmation.

## Task Details
**Files:**
- Create: `tests/extension-e2e-workflow.test.ts`
- Test: All tests in repository

**Interfaces:**
- Consumes:
  - Express server `app` in `server.ts`
  - Database service `dbService` in `server/services/db.service.ts`
  - Extension modules: `extension/extractor.js`, `extension/popup.js`, `extension/manifest.json`
- Produces:
  - Integration test `tests/extension-e2e-workflow.test.ts` simulating the end-to-end pipeline:
    1. Preflight `OPTIONS /api/health` with Chrome Private Network Access headers (`Access-Control-Request-Private-Network: true`).
    2. Parsing job via `POST /api/jobs/parse-job` with `{ url, linkTitle, rawText }`.
    3. Duplicate detection query `GET /api/applications`.
    4. Saving application via `POST /api/applications` with `'Do zaaplikowania'` status.
    5. Retrieving saved application from database via `GET /api/applications/:id` and confirming fields (`role`, `company`, `status`, `timeline`, `salary`, `skills`).
    6. Updating application via `PUT /api/applications/:id` when duplicate is resolved by updating.
    7. Extension asset integrity verification (verifying `manifest.json`, icon paths, `popup.html`, `popup.css`, `popup.js`, `extractor.js`).

**Step 1: Write the integration test**
Create `tests/extension-e2e-workflow.test.ts`.

**Step 2: Run test to verify it passes**
Run: `node ./node_modules/vitest/vitest.mjs run tests/extension-e2e-workflow.test.ts`

**Step 3: Run full test suite**
Run: `node ./node_modules/vitest/vitest.mjs run`
Verify all 21 test files pass.

**Step 4: Run TypeScript check**
Run: `node ./node_modules/typescript/bin/tsc --noEmit`
Verify 0 errors.

**Step 5: Commit**
`git add tests/extension-e2e-workflow.test.ts`
`git commit -m "test: add end-to-end integration test suite for extension and backend"`
