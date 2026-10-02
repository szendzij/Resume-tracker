# Task 3 Brief: DOM Content Extractor Script (`extractor.js`)

## Global Constraints
- Manifest version 3.
- All icon files declared in manifest exist on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- Asynchronous Chrome APIs must use async/await.
- Server must return Access-Control-Allow-Private-Network: true on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend must return heuristic job data and the extension must allow saving.
- Never run git push without direct, explicit user request.
- Git commits and staging are pre-approved and do not require user confirmation.

## Task Details
**Files:**
- Create: `extension/extractor.js`
- Test: `tests/extractor.test.ts`

**Interfaces:**
- Consumes: Browser DOM (`document`, `window`, `window.getSelection()`)
- Produces: An IIFE or self-executing return object:
  ```ts
  interface ExtractedPageData {
    url: string;
    title: string;
    rawText: string;
    selectedText: string;
    metaDescription: string;
  }
  ```
  Note: When executed via `chrome.scripting.executeScript({ target: { tabId }, files: ['extractor.js'] })`, the last evaluated expression in the file is returned in `result[0].result`. Wrapping the script in an IIFE `(() => { ... return result; })()` or assigning to `window.__resumeTrackerExtractedData` and returning it ensures Chrome receives the object cleanly. Also expose `window.__extractJobOfferData` or `module.exports` / global if needed for unit testing in JSDOM.

**Step 1: Write the failing test**
Create `tests/extractor.test.ts` using Vitest in JSDOM environment:
1. When user has active text selection (`window.getSelection().toString()`), `selectedText` matches the selection and `rawText` equals `selectedText`.
2. When no selection, `rawText` extracts main text while ignoring noise tags (`<script>`, `<style>`, `<noscript>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<svg>`, `<iframe>`, `<form>`).
3. When page text exceeds 7,000 characters, `rawText` is trimmed to at most 7,000 characters.
4. Extracts `document.title`, `window.location.href`, and `meta[property="og:description"]` or `meta[name="description"]`.

**Step 2: Run test to verify it fails**
Run: `node ./node_modules/vitest/vitest.mjs run tests/extractor.test.ts`
Expected: FAIL (`extractor.js` does not exist).

**Step 3: Implement `extension/extractor.js`**
Implement the DOM extraction algorithm:
- Function `extractJobOfferData(doc = document, win = window)`:
  - Check `win.getSelection()?.toString()?.trim()`.
  - If selection exists and has >= 10 non-whitespace characters, set `selectedText` and use it as `rawText`.
  - Else:
    - Look for priority content selectors: `main, article, [role="main"], .job-description, #job-details, .offer-details, body`.
    - Clone or traverse elements, skipping elements matching: `script, style, noscript, nav, header, footer, aside, svg, iframe, form, button`.
    - Extract text, collapse multiple whitespaces/newlines.
    - Truncate `rawText` to 7,000 characters.
  - Extract `url`: `win.location.href`.
  - Extract `title`: `doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.title || ''`.
  - Extract `metaDescription`: `doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || doc.querySelector('meta[name="description"]')?.getAttribute('content') || ''`.
  - Return `{ url, title, rawText, selectedText: selectedText || '', metaDescription }`.
- Provide universal export (if `typeof module !== 'undefined'` export it for tests, and when run in browser, execute and return the result).

**Step 4: Run test to verify it passes**
Run: `node ./node_modules/vitest/vitest.mjs run tests/extractor.test.ts`
Expected: PASS
Run full test suite: `node ./node_modules/vitest/vitest.mjs run`
Run TypeScript typecheck: `node ./node_modules/typescript/bin/tsc --noEmit`

**Step 5: Commit**
`git add extension/extractor.js tests/extractor.test.ts`
`git commit -m "feat(extension): implement intelligent DOM content extractor"`
