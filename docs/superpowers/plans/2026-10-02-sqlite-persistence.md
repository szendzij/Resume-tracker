# SQLite Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize and persist job applications using SQLite on the backend with Docker volume mounting and two-way frontend synchronization.

**Architecture:** Add Prisma ORM with SQLite file storage (`./data/tracker.db`), expose REST endpoints (`/api/applications`), integrate `useApplications` with server fetching and localStorage-to-database bootstrap migration, and update Dockerfile/docker-compose to mount the data directory with appropriate non-root permissions.

**Tech Stack:** Express 4, Prisma ORM, SQLite, React 19, TypeScript, Docker Compose, Vitest.

**Spec:** [docs/superpowers/specs/2026-10-02-sqlite-persistence-design.md](file:///C:/Users/szend/Documents/GitHub/Resume-tracker/docs/superpowers/specs/2026-10-02-sqlite-persistence-design.md)

## Global Constraints

- Database URL default: `file:./data/tracker.db` in development, `file:/app/data/tracker.db` in Docker container.
- Non-root Docker user `bun` must have write permissions to `/app/data`.
- Keep existing fallback principles: if database is unreachable or offline, the client can fall back to local state and notify gracefully.
- Preserve all existing fields and structure of `JobApplication` from `src/types.ts`.
- In Windows terminal, use `cmd.exe /c "..."` for npm/npx scripts if PowerShell execution policy prevents running `.ps1` wrappers directly.

## Review Focus

- Malformed or corrupt JSON in serialized fields (`skills`): `safeJsonParse` fallback returns empty array rather than throwing 500.
- Database file doesn't exist yet on first startup: Prisma automatically initializes schema or directory is created without crashing server.
- Duplicate ID collision on batch import: Batch insertion upserts or handles conflict gracefully without losing records.
- Network error when frontend performs CRUD: UI displays clear notification and maintains optimistic local state without unhandled promise crash.
- Docker container restarts on Proxmox: Mounted host volume `./data` retains database file across container recreation.

---

### Task 1: Prisma ORM Setup & Database Client Service

**Files:**
- Create: `prisma/schema.prisma`
- Create: `server/services/db.service.ts`
- Test: `server/services/db.service.test.ts`
- Modify: `package.json:16-42`
- Modify: `server/config/env.ts:1-12`

**Interfaces:**
- Consumes: `JobApplication` from `src/types.ts`, `ENV` from `server/config/env.ts`
- Produces: `db` service exporting:
  - `getAllApplications(): Promise<JobApplication[]>`
  - `getApplicationById(id: string): Promise<JobApplication | null>`
  - `saveApplication(app: JobApplication): Promise<JobApplication>`
  - `saveApplicationsBatch(apps: JobApplication[]): Promise<{ count: number }>`
  - `deleteApplication(id: string): Promise<boolean>`
  - `deleteApplicationsBatch(ids: string[]): Promise<number>`

- [ ] **Step 1: Install Prisma dependencies & @testing-library/dom fix**
Run: `cmd.exe /c "npm install prisma @prisma/client @testing-library/dom --save-dev"` and `npm install @prisma/client`
Expected: Dependencies installed in `package.json`.

- [ ] **Step 2: Create `prisma/schema.prisma`**
Define SQLite datasource using `DATABASE_URL` and `Application` model matching spec (with text columns for serialized JSON arrays).
Run: `cmd.exe /c "npx prisma generate"`
Expected: Prisma Client generated successfully.

- [ ] **Step 3: Update `server/config/env.ts`**
Add `DATABASE_URL: process.env.DATABASE_URL || 'file:./data/tracker.db'` to `ENV`.

- [ ] **Step 4: Write failing unit test `server/services/db.service.test.ts`**
```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { dbService } from './db.service';
import { JobApplication } from '../../src/types';

describe('dbService', () => {
  it('saves and retrieves applications with parsed JSON fields', async () => {
    const mockApp: JobApplication = {
      id: 'test-job-1',
      role: 'QA Engineer',
      company: 'TestCorp',
      portal: 'LinkedIn',
      url: 'https://example.com/job/1',
      appliedDate: '2026-10-02',
      status: 'Wysłana',
      skills: ['TypeScript', 'Playwright'],
    };
    await dbService.saveApplication(mockApp);
    const retrieved = await dbService.getApplicationById('test-job-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.skills).toEqual(['TypeScript', 'Playwright']);
    expect(retrieved?.company).toBe('TestCorp');
  });
});
```

- [ ] **Step 5: Run test to verify it fails**
Run: `cmd.exe /c "npx vitest run server/services/db.service.test.ts"`
Expected: FAIL (cannot find module `db.service`).

- [ ] **Step 6: Implement `server/services/db.service.ts`**
Implement CRUD methods mapping Prisma `Application` to/from `JobApplication` (serializing/deserializing `skills`). Ensure safe JSON parse fallback for empty/corrupt fields.
Run: `cmd.exe /c "npx prisma db push"`
Expected: SQLite schema synced in `./data/tracker.db`.

- [ ] **Step 7: Run test to verify it passes**
Run: `cmd.exe /c "npx vitest run server/services/db.service.test.ts"`
Expected: PASS.

- [ ] **Step 8: Commit**
```bash
git add package.json package-lock.json prisma/ schema.prisma server/config/env.ts server/services/db.service.ts server/services/db.service.test.ts
git commit -m "feat(db): configure Prisma SQLite schema and db.service"
```

---

### Task 2: Backend REST Routes for Applications (`/api/applications`)

**Files:**
- Create: `server/routes/applications.routes.ts`
- Modify: `server.ts:5-32`
- Test: `server/routes/applications.routes.test.ts`

**Interfaces:**
- Consumes: `dbService` from `server/services/db.service.ts`
- Produces: Express router mounted at `/api/applications`:
  - `GET /api/applications` -> `JobApplication[]`
  - `POST /api/applications` -> `JobApplication`
  - `POST /api/applications/batch` -> `{ count: number, applications: JobApplication[] }`
  - `PUT /api/applications/:id` -> `JobApplication`
  - `DELETE /api/applications/:id` -> `{ success: true, id: string }`
  - `DELETE /api/applications` -> `{ success: true, count: number }`

- [ ] **Step 1: Write failing integration test `server/routes/applications.routes.test.ts`**
```typescript
import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { applicationsRouter } from './applications.routes';

describe('applicationsRouter', () => {
  it('GET / returns applications from dbService', async () => {
    // test using supertest or node http fetch against mock express instance
  });
  it('POST / saves application and returns 201', async () => {
    // test POST /
  });
  it('POST /batch saves multiple applications', async () => {
    // test POST /batch
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
Run: `cmd.exe /c "npx vitest run server/routes/applications.routes.test.ts"`
Expected: FAIL (cannot find module `applications.routes`).

- [ ] **Step 3: Implement `server/routes/applications.routes.ts` and mount in `server.ts`**
Implement the router handling GET, POST, POST /batch, PUT /:id, DELETE /:id, and DELETE (bulk).
Mount `app.use('/api/applications', applicationsRouter);` in `server.ts`.

- [ ] **Step 4: Run test to verify it passes**
Run: `cmd.exe /c "npx vitest run server/routes/applications.routes.test.ts"`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add server/routes/applications.routes.ts server/routes/applications.routes.test.ts server.ts
git commit -m "feat(api): add /api/applications REST endpoints"
```

---

### Task 3: Frontend API Client & State Synchronization (`useApplications.ts`)

**Files:**
- Modify: `src/services/api.ts:70-186`
- Modify: `src/hooks/useApplications.ts:1-180`
- Test: `src/services/api.applications.test.ts`
- Test: `src/hooks/useApplications.test.ts`

**Interfaces:**
- Consumes: `/api/applications` endpoints
- Produces:
  - `api.getApplications()`, `api.createApplication()`, `api.updateApplication()`, `api.deleteApplication()`, `api.batchCreateApplications()`, `api.batchDeleteApplications()`
  - Synchronized `useApplications` with automatic localStorage-to-database bootstrap migration

- [ ] **Step 1: Write failing test `src/services/api.applications.test.ts`**
Verify `api.getApplications()`, `api.createApplication()`, `api.batchCreateApplications()` invoke fetch with correct methods and payload.

- [ ] **Step 2: Run test to verify it fails**
Run: `cmd.exe /c "npx vitest run src/services/api.applications.test.ts"`
Expected: FAIL (functions not defined on `api`).

- [ ] **Step 3: Add application methods to `src/services/api.ts`**
Implement typed methods calling `/api/applications`.

- [ ] **Step 4: Update `src/hooks/useApplications.ts` for database sync and migration**
1. On initial mount, fetch applications from `api.getApplications()`.
2. If server returns empty array (`length === 0`) and `localStorage` has existing user applications:
   - Call `api.batchCreateApplications(localApps)`.
   - Set state and display notification: `"Zsynchronizowano istniejące aplikacje z bazą danych!"`.
3. In `saveApplication`, `deleteApplication`, `updateStatus`, `addBatchApplications`:
   - Perform optimistic local state update.
   - Dispatch async call to backend API.
   - Keep `localStorage` in sync as backup cache.

- [ ] **Step 5: Run tests to verify all tests pass**
Run: `cmd.exe /c "npx vitest run src/services/api.applications.test.ts"`
Expected: PASS.

- [ ] **Step 6: Commit**
```bash
git add src/services/api.ts src/hooks/useApplications.ts src/services/api.applications.test.ts
git commit -m "feat(client): sync useApplications state with backend database"
```

---

### Task 4: Docker & Docker Compose Volume Configuration

**Files:**
- Modify: `Dockerfile:1-46`
- Modify: `docker-compose.yml:1-22`
- Modify: `.env.example:1-20`
- Create or update: `scripts/docker-entrypoint.sh` or startup command

**Interfaces:**
- Consumes: Environment variable `DATABASE_URL`
- Produces: Docker container persisting `./data/tracker.db` on Proxmox host

- [ ] **Step 1: Update `Dockerfile`**
1. In Stage 1 (builder), copy `prisma/` and run `npx prisma generate` during build.
2. In Stage 2 (runner), create `/app/data` directory and assign ownership:
   `RUN mkdir -p /app/data && chown -R bun:bun /app/data`
3. Ensure Prisma client runtime is available in runner.

- [ ] **Step 2: Update `docker-compose.yml`**
Add volume mapping:
```yaml
volumes:
  - ./data:/app/data
```
Add environment variable:
```yaml
DATABASE_URL: ${DATABASE_URL:-file:/app/data/tracker.db}
```

- [ ] **Step 3: Update `.env.example`**
Add `DATABASE_URL="file:./data/tracker.db"`.

- [ ] **Step 4: Verify complete test suite and build**
Run: `cmd.exe /c "npx vitest run"`
Run: `cmd.exe /c "npm run build"`
Expected: All tests pass and build succeeds.

- [ ] **Step 5: Commit**
```bash
git add Dockerfile docker-compose.yml .env.example
git commit -m "feat(docker): persist SQLite database in /app/data volume"
```
