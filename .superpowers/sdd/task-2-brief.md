# Task 2 Brief: Extension Manifest, Icons Generation & Documentation

## Global Constraints
- Manifest version must strictly be 3 (no Manifest V2 APIs like browserAction or background scripts).
- All icon files declared in manifest.json ('16', '48', '128') must exist as real valid PNG image files on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- Asynchronous Chrome APIs must use async/await.
- Server must return Access-Control-Allow-Private-Network: true on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend must return heuristic job data and the extension must allow saving.
- Never run git push without direct, explicit user request.
- Git commit rule: commits and staging are pre-approved and do not require user confirmation.

## Task Details
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

**Step 1: Write the failing test**
Create `tests/extension-manifest.test.ts` using `vitest`:
- Verify `extension/manifest.json` exists and parses as valid JSON.
- Verify `manifest_version === 3`.
- Verify `permissions` includes `'activeTab'`, `'scripting'`, `'storage'`.
- Verify `host_permissions` includes `'http://*/*'` and `'https://*/*'`.
- Verify `action.default_popup === 'popup.html'`.
- Verify `commands._execute_action.suggested_key.default === 'Alt+Shift+J'`.
- Verify `commands._execute_action.description` is present.
- Verify referenced icons (`icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`) exist on disk and have non-zero size.

**Step 2: Run test to verify it fails**
Run test using `node ./node_modules/vitest/vitest.mjs run tests/extension-manifest.test.ts`
Confirm FAIL.

**Step 3: Implement icon generator, manifest, and README**
1. Create `extension/generate-icons.cjs`:
   - A pure Node.js script (using `zlib` for deflate chunk) to generate valid uncompressed or zlib-compressed PNGs for 16x16, 48x48, 128x128 with the Resume Tracker brand colors (indigo/dark blue square with stylized job card/symbol).
   - Ensure it creates `extension/icons` directory and outputs valid PNG header bytes (`0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`).
2. Run `node extension/generate-icons.cjs` to create the 3 PNG files.
3. Create `extension/manifest.json`:
   ```json
   {
     "manifest_version": 3,
     "name": "Resume Tracker - Job Clipper",
     "version": "1.0.0",
     "description": "Zapisuj oferty pracy z przeglądarki bezpośrednio do Resume Tracker na Proxmoxie",
     "action": {
       "default_popup": "popup.html",
       "default_icon": {
         "16": "icons/icon-16.png",
         "48": "icons/icon-48.png",
         "128": "icons/icon-128.png"
       }
     },
     "icons": {
       "16": "icons/icon-16.png",
       "48": "icons/icon-48.png",
       "128": "icons/icon-128.png"
     },
     "permissions": [
       "activeTab",
       "scripting",
       "storage"
     ],
     "host_permissions": [
       "http://*/*",
       "https://*/*"
     ],
     "commands": {
       "_execute_action": {
         "suggested_key": {
           "default": "Alt+Shift+J",
           "mac": "Alt+Shift+J"
         },
         "description": "Otwórz Resume Tracker Job Clipper"
       }
     }
   }
   ```
4. Create `extension/README.md` explaining:
   - How to install in Chrome (`chrome://extensions` -> Tryb dewelopera -> Wczytaj rozpakowane -> wybierz folder `extension`).
   - How to configure the Proxmox IP address (e.g. `http://192.168.x.x:3050`) in the extension settings.
   - Shortcut `Alt+Shift+J`.

**Step 4: Run test to verify it passes**
Run: `node ./node_modules/vitest/vitest.mjs run tests/extension-manifest.test.ts`
Also run full test suite: `node ./node_modules/vitest/vitest.mjs run`
Run TypeScript check: `node ./node_modules/typescript/bin/tsc --noEmit`

**Step 5: Commit**
Stage and commit changes:
`git add extension/ tests/extension-manifest.test.ts`
`git commit -m "feat(extension): add manifest V3, icon generator, and documentation"`
