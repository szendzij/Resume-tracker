# Task 1 Brief: Backend CORS, Private Network Access & Domain Status Updates

## Global Constraints
- Manifest version 3.
- All icon files declared in manifest exist on disk.
- Zero eval(), zero new Function(), zero inline script tags.
- Asynchronous Chrome APIs must use async/await.
- Server must return `Access-Control-Allow-Private-Network: true` on preflight and regular responses to support Chrome >= 142 Local Network Access for Proxmox LAN IP addresses.
- Fallback resilience: If Gemini API fails or has no key, the backend must return heuristic job data and the extension must allow saving.
- Never run `git push` without direct, explicit user request.

## Task Details
**Files:**
- Modify: `server.ts`
- Modify: `src/types.ts`
- Modify: `src/utils/statusConfig.ts`
- Test: `tests/server-cors.test.ts`

**Interfaces:**
- Consumes: Express app in `server.ts`, existing `/api/health`, `/api/jobs/parse-job`, `/api/applications`
- Produces:
  - CORS middleware in `server.ts` supporting `OPTIONS` preflight with `Access-Control-Allow-Private-Network: true`
  - `JobStatus` containing `'Do zaaplikowania'` in `src/types.ts`
  - `STATUS_CONFIG['Do zaaplikowania']` and `ALL_STATUSES` containing `'Do zaaplikowania'` in `src/utils/statusConfig.ts`

**Step 1: Write the failing test**
Create `tests/server-cors.test.ts` using `vitest`:
- Test that `OPTIONS /api/health` returns status `204` with header `access-control-allow-private-network: true` and `access-control-allow-origin: *`.
- Test that `GET /api/health` returns headers `access-control-allow-origin: *` and `access-control-allow-private-network: true`.
- Test that `'Do zaaplikowania'` is present in `ALL_STATUSES` and in `STATUS_CONFIG` with `bg`, `text`, `border`, `dot`, `badgeClass`, `description`.

**Step 2: Run test to verify it fails**
Run: `bun test tests/server-cors.test.ts` or `npx vitest run tests/server-cors.test.ts`

**Step 3: Implement minimal code**
1. In `server.ts`:
   Add the CORS & PNA middleware right after `app.use(express.json(...))`:
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
2. In `src/types.ts`:
   Add `'Do zaaplikowania'` as the first entry in `JobStatus` type union.
3. In `src/utils/statusConfig.ts`:
   Add `'Do zaaplikowania'` to `STATUS_CONFIG` with indigo/slate colors and clear Polish description ("Zapisana oferta, oczekuje na przygotowanie i wysłanie CV").
   Add `'Do zaaplikowania'` to `ALL_STATUSES`.

**Step 4: Run test to verify it passes**
Run: `bun test tests/server-cors.test.ts` or `npx vitest run tests/server-cors.test.ts`
Also verify existing tests: `bun run test`

**Step 5: Commit**
Stage and commit changes:
`git add server.ts src/types.ts src/utils/statusConfig.ts tests/server-cors.test.ts`
`git commit -m "feat(server): add CORS with Private Network Access and 'Do zaaplikowania' status"`
(Note: On Windows sandbox, git commands may require BypassSandbox: true).
