# Task 3 Report: DOM Content Extractor Script (`extractor.js`)

**Date**: 2026-10-02  
**Status**: DONE  
**Commit**: `e40806720e3245cb2a22b75d20f1933350cbee1f` (`feat(extension): implement intelligent DOM content extractor`)

---

## 1. Executive Summary

Implemented the intelligent DOM content extractor script (`extension/extractor.js`) and corresponding Vitest unit tests in JSDOM (`tests/extractor.test.ts`) using strict Test-Driven Development (TDD).

When injected into the active browser tab via Chrome Extension MV3 scripting API (`chrome.scripting.executeScript`), the script reliably extracts job offer text, active user selections, page metadata (og:title, title, og:description, meta description, URL), eliminates noise tags (`<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<svg>`, `<iframe>`, `<form>`, `<button>`), prioritizes semantic job description containers, and normalizes and truncates content up to 7,000 characters.

---

## 2. Interface & Behavior

### Interface Definition
```typescript
interface ExtractedPageData {
  url: string;
  title: string;
  rawText: string;
  selectedText: string;
  metaDescription: string;
}
```

### Extraction Logic
1. **User Selection Detection**:
   - Inspects `window.getSelection()?.toString()?.trim()`.
   - If selected text is >= 10 non-whitespace characters, sets `selectedText` and uses it directly as `rawText` (allowing users to highlight exact job posting content when portals use complex layouts or iframes).
   - If selection < 10 characters, ignores selection and proceeds to automated DOM traversal.

2. **Priority Job Container Detection**:
   - Scans in priority order:
     - `.job-description`
     - `#job-details`
     - `.offer-details`
     - `main`
     - `article`
     - `[role="main"]`
     - `body`
   - Clones target container to prevent mutating the host webpage's DOM.

3. **Noise Element Removal**:
   - Strips tags matching `script, style, noscript, nav, header, footer, aside, svg, iframe, form, button`.
   - Collapses multiple whitespace characters and empty lines.

4. **Length Constraint**:
   - Truncates `rawText` to 7,000 characters if content exceeds this limit.

5. **Metadata Extraction**:
   - `url`: `win.location.href`.
   - `title`: `meta[property="og:title"]` content fallback to `doc.title`.
   - `metaDescription`: `meta[property="og:description"]` content fallback to `meta[name="description"]` content.

6. **Chrome MV3 Compatibility**:
   - Fully compliant with Manifest V3 and Content Security Policy:
     - **0** `eval()` calls
     - **0** `new Function()` invocations
     - **0** inline scripts
   - Universal execution model:
     - Wrapped in IIFE returning `result` for direct consumption by `chrome.scripting.executeScript` (`result[0].result`).
     - Exposes `window.__resumeTrackerExtractedData`, `window.__extractJobOfferData`, and `window.extractJobOfferData`.
     - Supports CommonJS `module.exports` for JSDOM / Vitest unit test imports without breaking classic script execution in Chrome.

---

## 3. TDD Verification & Test Results

### Step 1: Failing Test (RED)
- Created `tests/extractor.test.ts`.
- Verified execution failure with `Error: Failed to resolve import "../extension/extractor.js" from "tests/extractor.test.ts". Does the file exist?`

### Step 2: Implementation (GREEN)
- Implemented `extension/extractor.js`.
- Verified targeted test suite:
  ```bash
  node ./node_modules/vitest/vitest.mjs run tests/extractor.test.ts
  # Result: 15 passed (15)
  ```

### Step 3: Type Checking & Regression Suite
- TypeScript typecheck (`tsc --noEmit`):
  ```bash
  node ./node_modules/typescript/bin/tsc --noEmit
  # Result: Exit code 0 (No type errors)
  ```
- Full Vitest test suite:
  ```bash
  node ./node_modules/vitest/vitest.mjs run
  # Result: 18 passed (18) test files, 140 passed (140) tests
  ```

---

## 4. Git Version Control

- **Staged & Committed Files**:
  - `extension/extractor.js`
  - `tests/extractor.test.ts`
- **Commit**: `e408067 feat(extension): implement intelligent DOM content extractor`
- No remote push was executed per project rules.

---

## 5. Next Steps

- **Task 4**: Backend CORS and Local Network Access (already verified in server-cors tests, ready for popup communication).
- **Task 5 / Extension Popup**: Inject `extractor.js` from `popup.js` using `chrome.scripting.executeScript` and pass extracted text into the Resume Tracker `/api/jobs/parse` or `/api/applications` backend endpoints.
