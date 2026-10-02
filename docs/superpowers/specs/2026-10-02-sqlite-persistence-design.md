# SQLite Persistence Specification (Self-Hosted Proxmox Docker)

> **Date:** 2026-10-02  
> **Status:** Approved  
> **Scope:** Architectural  

---

## 1. Overview & Goals

Resume Tracker is currently deployed as a Docker container in a local Proxmox environment. At present, job applications and user settings are persisted exclusively on the client side via the browser's `localStorage`. Accessing the application across different devices or clearing browser cache results in data loss or out-of-sync states.

This specification introduces a persistent SQLite database running inside the backend service with Docker volume mounts for continuous state persistence on the Proxmox host.

### Goals
- Centralize all job application records in a lightweight SQLite database.
- Mount the database directory to the Proxmox host filesystem via Docker Compose (`./data:/app/data`) for trivial backup and disaster recovery.
- Provide a clean REST API (`/api/applications`) for CRUD and batch operations.
- Ensure smooth transition and migration of existing `localStorage` data into the database on first load.
- Ensure Docker container non-root user (`bun`) has proper permissions on the mounted data directory.

---

## 2. Technology & Architecture

### Database & ORM
- **Engine:** SQLite (file-based database).
- **ORM / Query Engine:** Prisma ORM with `@prisma/client`.
- **Database Location:**
  - Local development: `./data/tracker.db`
  - Docker container: `/app/data/tracker.db` (mapped via Docker volume)
- **Environment Variable:** `DATABASE_URL="file:/app/data/tracker.db"` (fallback: `file:./data/tracker.db`)

### Schema Definition (`prisma/schema.prisma`)
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Application {
  id             String   @id @default(uuid())
  company        String
  role           String
  location       String?
  status         String   @default("applied")
  portal         String?
  appliedDate    String
  lastUpdated    String
  salary         String?
  url            String?
  notes          String?
  priority       String?  @default("medium")
  
  // JSON serialized fields for nested structured items
  skills         String?  // JSON array: string[]
  contacts       String?  // JSON array: JobContact[]
  timeline       String?  // JSON array: TimelineEvent[]
  interviewSteps String?  // JSON array: InterviewStep[]
  history        String?  // JSON array: StatusHistoryEntry[]

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 3. Backend Endpoints (`server/routes/applications.routes.ts`)

Mount under `/api/applications`:

- `GET /api/applications`
  - Returns: Array of `JobApplication` with JSON fields parsed into native arrays.
- `POST /api/applications`
  - Body: Single `JobApplication`
  - Returns: Created `JobApplication`.
- `POST /api/applications/batch`
  - Body: `{ applications: JobApplication[] }`
  - Supports initial sync/import, CSV import, and batch additions.
  - Returns: `{ count: number, applications: JobApplication[] }`.
- `PUT /api/applications/:id`
  - Body: Partial update payload.
  - Returns: Updated `JobApplication`.
- `DELETE /api/applications/:id`
  - Returns: `{ success: true, id: string }`.
- `DELETE /api/applications` (Bulk delete)
  - Body: `{ ids: string[] }`
  - Returns: `{ success: true, count: number }`.

---

## 4. Frontend Integration (`src/hooks/useApplications.ts` & `src/services/api.ts`)

1. **API Client Additions:**
   - Implement `api.getApplications()`, `api.createApplication()`, `api.updateApplication()`, `api.deleteApplication()`, and `api.batchCreateApplications()`.

2. **Hook Migration & Lifecycle:**
   - On initial mount:
     1. Fetch existing applications from `GET /api/applications`.
     2. If database returns 0 records and `localStorage` contains user data:
        - Automatically upload existing `localStorage` applications to `POST /api/applications/batch`.
        - Initialize state with these records.
     3. If database returns existing records:
        - Initialize state from server; update `localStorage` as an offline cache/backup.
   - For all CRUD operations:
     - Optimistically update local state.
     - Persist change asynchronously via backend API.
     - Revert or notify user if backend operation fails.

---

## 5. Docker & Environment Configuration

### `docker-compose.yml`
```yaml
services:
  resume-tracker:
    # ...
    volumes:
      - ./data:/app/data
    environment:
      - DATABASE_URL=file:/app/data/tracker.db
      # ...
```

### `Dockerfile`
- Ensure directory `/app/data` is created before switching to user `bun`:
  ```dockerfile
  RUN mkdir -p /app/data && chown -R bun:bun /app/data
  ```
- Generate Prisma Client during build step (`bun run prisma generate` or `npx prisma generate`).
- Run database migrations / schema push before or during startup (e.g. `bun run prisma db push` or startup script).

### `.env.example`
- Add `DATABASE_URL="file:./data/tracker.db"`.

---

## 6. Testing & Validation Plan

1. **Unit & API Testing:**
   - Test `applications.routes.ts` endpoints using mock database or in-memory SQLite.
   - Verify serialization/deserialization of JSON fields (`skills`, `timeline`, `interviewSteps`, etc.).
2. **Migration Testing:**
   - Verify that existing `localStorage` entries get auto-migrated when database is clean.
3. **Docker Verification:**
   - Build image via `docker compose build`.
   - Start container and verify `/app/data/tracker.db` is populated on host's `./data` folder.
   - Restart container and verify data persists across restarts.
