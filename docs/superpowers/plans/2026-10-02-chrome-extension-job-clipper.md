# Chrome Extension (Job Clipper) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight Chrome Extension (Manifest V3) that extracts job offer details from any active browser tab, analyzes them via the Resume Tracker backend (Gemini AI + heuristic fallback), presents an editable preview in a popup with duplicate detection, and saves or updates the job in the database on Proxmox in the local network.

**Architecture:** A standalone `extension/` directory (Manifest V3) containing a popup UI (`popup.html`, `popup.css`, `popup.js`), an injectable content extractor (`extractor.js`), and generated PNG icons. The extension communicates via HTTP `fetch` with the Express backend, which is enhanced with CORS and Chrome Private Network Access (PNA) headers (`Access-Control-Allow-Private-Network: true`). The system domain model is extended with a new `'Do zaaplikowania'` status.

**Tech Stack:** Chrome Extensions Manifest V3 (Vanilla TypeScript/JavaScript, HTML5, CSS3), Node.js / Bun, Express 4, Vitest, JSDOM.

**Spec:** [`docs/superpowers/specs/2026-10-02-chrome-extension-job-clipper-design.md`](file:///C:/Users/szend/Documents/GitHub/Resume-tracker/docs/superpowers/specs/2026-10-02-chrome-extension-job-clipper-design.md)

---

## Global Constraints

- Manifest version must strictly be `3` (no Manifest V2 APIs like `browserAction` or background scripts).
- All icon files declared in `manifest.json` (`16`, `48`, `128`) must exist as real valid PNG image files on disk.
- Zero `eval()`, zero `new Function()`, and zero inline `<script>` tags in extension HTML pages.
- Asynchronous Chrome APIs must use `async`/`await` (no `.then()` chains).
- Server must return `Access-Control-Allow-Private-Network: true` on preflight and regular responses to support Chrome $\ge$ 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend must return heuristic job data and the extension must allow saving.
- Never run `git push` without direct, explicit user request.

---

## Review Focus

1. **Private Network Access Preflight:** Chrome preflight `OPTIONS` request with `Access-Control-Request-Private-Network: true` must respond with HTTP 204 and `Access-Control-Allow-Private-Network: true`.
2. **Restricted Tab Protection:** Invoking the extension on special URLs (e.g. `chrome://`, `edge://`, `about:blank`) must catch script injection errors and display a friendly guidance UI instead of crashing.
3. **Fuzzy Duplicate Detection:** Duplicate detection must match either normalized URL or normalized (Company + Role) pair, preventing duplicate entries for identical jobs from different referral URLs.
4. **Offline / Unreachable Proxmox Instance:** When `fetch()` to `serverUrl` fails (network error / timeout), the popup must enter an error state without losing the extracted job text, providing a retry button and server settings link.
5. **DOM Extraction Noise Removal:** The content extractor must strip scripts, styles, navigation, headers, and footers while prioritizing user-selected text if present.

---

## File Structure

```
Resume-tracker/
├── extension/
│   ├── manifest.json              # Manifest V3 configuration & permissions
│   ├── generate-icons.cjs         # Node.js icon generator script
│   ├── icons/
│   │   ├── icon-16.png            # 16x16 PNG extension icon
│   │   ├── icon-48.png            # 48x48 PNG extension icon
│   │   └── icon-128.png           # 128x128 PNG extension icon
│   ├── extractor.js               # Content script injected into active tab
│   ├── popup.html                 # Extension popup markup (4 views)
│   ├── popup.css                  # Dark theme styling matching Resume Tracker
│   ├── popup.js                   # Popup state machine & API client
│   └── README.md                  # Extension installation & Proxmox connection guide
├── server.ts                      # Express server with CORS & PNA middleware
├── src/
│   ├── types.ts                   # Extended JobStatus ('Do zaaplikowania')
│   └── utils/
│       └── statusConfig.ts        # Configuration for 'Do zaaplikowania' status
└── tests/
    ├── extension-manifest.test.ts # Manifest and icon presence validation
    ├── extractor.test.ts          # DOM extraction & noise removal unit test
    ├── popup-controller.test.ts   # Popup state machine & API client unit test
    └── server-cors.test.ts        # CORS & Private Network Access test
```

---

### Task 1: Backend CORS, Private Network Access & Domain Status Updates

**Files:**
- Modify: `server.ts:15-35`
- Modify: `src/types.ts:1-10`
- Modify: `src/utils/statusConfig.ts:1-98`
- Test: `tests/server-cors.test.ts`

**Interfaces:**
- Consumes: Express `app`, existing `/api/health`, `/api/jobs/parse-job`, `/api/applications`
- Produces:
  - CORS middleware supporting `OPTIONS` preflight with `Access-Control-Allow-Private-Network: true`
  - `JobStatus` containing `'Do zaaplikowania'`
  - `STATUS_CONFIG['Do zaaplikowania']` and `ALL_STATUSES` containing `'Do zaaplikowania'`

- [ ] **Step 1: Write the failing test for CORS and PNA headers**

Create `tests/server-cors.test.ts` verifying that:
1. `OPTIONS /api/health` returns status `204` with header `access-control-allow-private-network: true` and `access-control-allow-origin: *`.
2. `GET /api/health` returns headers `access-control-allow-origin: *` and `access-control-allow-private-network: true`.
3. `'Do zaaplikowania'` is a valid `JobStatus` and is configured in `STATUS_CONFIG` and `ALL_STATUSES`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/server-cors.test.ts`  
Expected: FAIL (missing CORS headers and missing `'Do zaaplikowania'` in `STATUS_CONFIG`).

- [ ] **Step 3: Implement CORS middleware and domain status updates**

1. In `server.ts`, register a middleware before routes:
   ```ts
   app.use((req, res, next) => {
     res.header('Access-Control-Allow-Origin', '*');
     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');
     res.header('Access-Control-Allow-Private-Network', 'true');
     if (req.method === 'OPTIONS') {
       res.sendStatus(204);
       return;
     }
     next();
   });
   ```
2. In `src/types.ts`, add `'Do zaaplikowania'` to `JobStatus`.
3. In `src/utils/statusConfig.ts`, add metadata for `'Do zaaplikowania'` (indigo/slate badge, description) and include it at the start of `ALL_STATUSES`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/server-cors.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server.ts src/types.ts src/utils/statusConfig.ts tests/server-cors.test.ts
git commit -m "feat(server): add CORS with Private Network Access and 'Do zaaplikowania' status"
```

---

### Task 2: Extension Manifest, Icons Generation & Documentation

**Files:**
- Create: `extension/manifest.json`
- Create: `extension/generate-icons.cjs`
- Create: `extension/icons/icon-16.png`
- Create: `extension/icons/icon-48.png`
- Create: `extension/icons/icon-128.png`
- Create: `extension/README.md`
- Test: `tests/extension-manifest.test.ts`

**Interfaces:**
- Consumes: Node.js standard libraries (`fs`, `path`, `zlib`)
- Produces:
  - Valid `manifest.json` for Chrome Manifest V3
  - Real PNG icon files in `extension/icons/`
  - Setup instructions in `extension/README.md`

- [ ] **Step 1: Write the failing test for manifest and icon validation**

Create `tests/extension-manifest.test.ts` verifying:
1. `extension/manifest.json` exists and parses as valid JSON.
2. `manifest_version` equals `3`.
3. `permissions` includes `activeTab`, `scripting`, `storage`.
4. `host_permissions` includes `http://*/*` and `https://*/*`.
5. `action.default_popup` points to `popup.html`.
6. `commands._execute_action.suggested_key.default` is `Alt+Shift+J`.
7. Referenced icons (`icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`) exist on disk and have non-zero size.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/extension-manifest.test.ts`  
Expected: FAIL (files do not exist yet).

- [ ] **Step 3: Implement icon generator, manifest, and README**

1. Create `extension/generate-icons.cjs` to generate 16x16, 48x48, 128x128 valid PNG files containing the Resume Tracker logo/symbol (indigo square with document/briefcase glyph) using uncompressed PNG chunks.
2. Run `node extension/generate-icons.cjs` to output the icons into `extension/icons/`.
3. Create `extension/manifest.json` according to the spec.
4. Create `extension/README.md` with instructions for loading into Chrome (`chrome://extensions` -> Developer Mode -> Load unpacked) and configuring the Proxmox server IP.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/extension-manifest.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/manifest.json extension/generate-icons.cjs extension/icons extension/README.md tests/extension-manifest.test.ts
git commit -m "feat(extension): add manifest V3, icon generator, and documentation"
```

---

### Task 3: DOM Content Extractor Script (`extractor.js`)

**Files:**
- Create: `extension/extractor.js`
- Test: `tests/extractor.test.ts`

**Interfaces:**
- Consumes: Browser DOM (`document`, `window`, `window.getSelection()`)
- Produces: Global or return object:
  ```ts
  interface ExtractedPageData {
    url: string;
    title: string;
    rawText: string;
    selectedText: string;
    metaDescription: string;
  }
  ```

- [ ] **Step 1: Write the failing test for DOM extraction**

Create `tests/extractor.test.ts` in JSDOM verifying:
1. When user has active text selection (`window.getSelection()`), `selectedText` matches selection and `rawText` equals `selectedText`.
2. When no selection, `rawText` extracts main text while ignoring `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, and `<aside>`.
3. When page text exceeds 7,000 characters, `rawText` is trimmed to at most 7,000 characters.
4. Extracts `document.title`, `window.location.href`, and `meta[property="og:description"]` or `meta[name="description"]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/extractor.test.ts`  
Expected: FAIL (`extractor.js` not found).

- [ ] **Step 3: Implement `extension/extractor.js`**

Implement DOM cleaning and extraction logic:
- Export/return IIFE result `{ url, title, rawText, selectedText, metaDescription }`.
- Prioritize `window.getSelection()?.toString()?.trim()`.
- Filter noisy selectors: `script, style, noscript, nav, header, footer, aside, svg, iframe, form, button`.
- Select target container: `main, article, [role="main"], .job-description, #job-details, body`.
- Normalize whitespace and truncate `rawText` to 7,000 characters.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/extractor.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/extractor.js tests/extractor.test.ts
git commit -m "feat(extension): implement intelligent DOM content extractor"
```

---

### Task 4: Extension Popup UI Markup & CSS (`popup.html` & `popup.css`)

**Files:**
- Create: `extension/popup.html`
- Create: `extension/popup.css`
- Test: `tests/popup-ui.test.ts`

**Interfaces:**
- Consumes: Static HTML5 & CSS3
- Produces:
  - 4 view containers: `#view-loading`, `#view-form`, `#view-success`, `#view-settings`
  - Elements: `#server-status-dot`, `#btn-settings`, `#btn-back`, `#duplicate-banner`, `#field-role`, `#field-company`, `#field-location`, `#field-salary`, `#field-portal`, `#field-status`, `#skills-container`, `#field-notes`, `#chk-include-full-text`, `#btn-save`, `#btn-update`, `#btn-test-connection`

- [ ] **Step 1: Write the failing test for popup markup structure**

Create `tests/popup-ui.test.ts` in JSDOM verifying:
1. `popup.html` contains the 4 view sections (`#view-loading`, `#view-form`, `#view-success`, `#view-settings`).
2. Form contains all required fields (`#field-role`, `#field-company`, `#field-location`, `#field-salary`, `#field-portal`, `#field-status`, `#field-notes`).
3. Status selector includes `'Do zaaplikowania'` and `'Wysłana'`.
4. Checkbox `#chk-include-full-text` exists.
5. `popup.html` references `popup.css` and `popup.js` via external tags with no inline scripts.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/popup-ui.test.ts`  
Expected: FAIL (files do not exist).

- [ ] **Step 3: Implement `popup.html` and `popup.css`**

1. Write `popup.html` with clean semantic HTML, accessible labels, dark theme markup matching Resume Tracker, and status indicator.
2. Write `popup.css` with responsive 400px width, sleek typography, badges, dark mode inputs (`#1e293b`), indigo primary buttons (`#6366f1`), warning styles for duplicate banner, and smooth view transitions.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/popup-ui.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/popup.html extension/popup.css tests/popup-ui.test.ts
git commit -m "feat(extension): create popup UI markup and dark theme styles"
```

---

### Task 5: Extension Popup Controller (`popup.js`) & Duplicate Detection

**Files:**
- Create: `extension/popup.js`
- Test: `tests/popup-controller.test.ts`

**Interfaces:**
- Consumes:
  - `chrome.tabs.query({ active: true, currentWindow: true })`
  - `chrome.scripting.executeScript({ target: { tabId }, files: ['extractor.js'] })`
  - `chrome.storage.sync.get(['serverUrl', 'customApiKey'])`
  - Backend endpoints: `GET /api/health`, `POST /api/jobs/parse-job`, `GET /api/applications`, `POST /api/applications`, `PUT /api/applications/:id`
- Produces:
  - Full interactive lifecycle in Chrome Popup:
    - Load settings & active tab
    - Extract text & call backend
    - Query duplicate check
    - Edit fields & manage skill tags
    - Save or Update application in database
    - Server connection test and settings update

- [ ] **Step 1: Write the failing test for popup controller**

Create `tests/popup-controller.test.ts` with mocks for `chrome.tabs`, `chrome.scripting`, `chrome.storage.sync`, and `fetch`:
1. Test normal flow: injects extractor, calls `/api/jobs/parse-job`, populates form fields, clicks Save, calls `POST /api/applications`.
2. Test duplicate detection: when `GET /api/applications` returns an existing app with same URL or Company+Role, `#duplicate-banner` is shown with dual buttons ("Zaktualizuj istniejący" and "Zapisz jako nowy").
3. Test settings flow: changing server URL and clicking "Testuj połączenie" calls `GET /api/health` and updates status badge.
4. Test network error handling: if `fetch` throws `Failed to fetch`, displays error message and preserves extracted text.
5. Test restricted tab: if tab URL starts with `chrome://`, shows friendly warning without calling executeScript.

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/popup-controller.test.ts`  
Expected: FAIL (`popup.js` not found).

- [ ] **Step 3: Implement `extension/popup.js`**

Implement modular controller:
- `normalizeUrl(url)` and `isDuplicate(existingApps, currentJob)` helpers.
- `renderView(viewName)` state machine (`'loading' | 'form' | 'success' | 'settings' | 'error'`).
- `testServerConnection(serverUrl)`.
- `parseJobWithBackend(serverUrl, extractedData, apiKey)`.
- Skill chips addition/removal event listeners.
- Save handler building `JobApplication` with initial timeline entry and optional full-text archive in `notes`.
- Update handler calling `PUT /api/applications/:id`.

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/popup-controller.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add extension/popup.js tests/popup-controller.test.ts
git commit -m "feat(extension): implement popup controller, API communication and duplicate resolution"
```

---

### Task 6: Full Integration Testing, Build Verification & Quality Gate

**Files:**
- Create: `tests/extension-e2e-workflow.test.ts`
- Modify: `package.json` (add convenience script `build:icons` if needed)
- Test: All tests via `bun run test`

**Interfaces:**
- Consumes: Complete extension package and Express server
- Produces: Verified end-to-end compatibility test suite

- [ ] **Step 1: Write the full workflow integration test**

Create `tests/extension-e2e-workflow.test.ts` testing the complete pipeline:
1. Simulates an incoming preflight request (`OPTIONS`) with `Access-Control-Request-Private-Network: true`.
2. Simulates `POST /api/jobs/parse-job` with sample job text from LinkedIn and Pracuj.pl.
3. Simulates duplicate query and saving new application with `'Do zaaplikowania'` status.
4. Verifies database contains saved application with timeline entry.

- [ ] **Step 2: Run the new test and complete test suite**

Run: `bun run test`  
Expected: All tests pass (including existing and new tests).

- [ ] **Step 3: Run linter and typecheck**

Run: `bun run lint`  
Expected: Clean output with 0 type errors.

- [ ] **Step 4: Commit**

```bash
git add tests/extension-e2e-workflow.test.ts package.json
git commit -m "test: add end-to-end integration test suite for extension and backend"
```

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-10-02-chrome-extension-job-clipper.md`.
