# AGENTS.md

> Documentation and technical guidelines for AI coding agents (and human contributors) working on the **Resume Tracker** codebase.

---

## 1. Project Overview

**Resume Tracker** is a full-stack web application designed to track, manage, and automate job application workflows.

Key capabilities:
- **Application Tracking**: Multiple views (Interactive Kanban board, searchable Table, visual Card Grid) with stage transitions, filters, and statistics.
- **AI-Powered Job Extraction**: Uses Google Gemini (`@google/genai`) to parse job postings from URLs or raw pasted text into structured details (role, company, location, skills, portal).
- **Email Synchronization & Classification**: Integrates with Microsoft Outlook and Google Gmail (via OAuth 2.0) or supports manual email pastes to detect application status updates automatically (e.g. interview invitations, rejections, confirmations) using Gemini and fallback heuristics.
- **Import / Export**: Batch URL ingestion, CSV import with field mapping and duplicate detection, CSV/JSON export.
- **Dockerized Deployment**: Fully self-contained multi-stage Docker build ready for Linux and cloud environments.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool / Bundler**: Vite 8 (`vite`, `@vitejs/plugin-react`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`, `tailwindcss`)
- **Animations**: `motion` (modern Framer Motion)
- **Icons**: `lucide-react`
- **Language**: TypeScript (`tsconfig.json`, moduleResolution: `bundler`)

### Backend
- **Framework**: Express 4 (`express`)
- **Database & ORM**: SQLite (`tracker.db`) via Prisma ORM (`@prisma/client` v6.4.1, `prisma/schema.prisma`)
- **Language**: TypeScript executed via `tsx` in development, bundled with `esbuild` for production
- **AI SDK**: `@google/genai` (Gemini API)
- **Email / Scraper**: Native `fetch` with AbortController, regex heuristics, OAuth popup handlers

### Package Manager & Runtimes
- **Primary Package Manager**: **Bun** (lockfile: `bun.lock`). When running commands, prefer `bun <command>`.
- **Node.js**: Compatible with Node 20+ / Node 22.
- **Testing**: Vitest (`vitest`) with `@testing-library/react` and `jsdom`.

---

## 3. Directory Structure

```
Resume-tracker/
├── .agents/                     # AI Agent configuration, skills, rules, hooks and workflows (ECC)
│   ├── agents/                  # Specialized subagents definitions
│   ├── hooks/                   # Lifecycle & safety hooks (GateGuard, audit, summary)
│   ├── rules/                   # Coding style, security, testing, and architecture rules
│   ├── skills/                  # Domain skills (TDD workflow, Bun/Docker troubleshoot, QA, etc.)
│   └── workflows/               # Automation pipelines
├── server.ts                    # Express entry point (serves API & Vite dev middleware / static dist)
├── package.json                 # Scripts, dependencies, devDependencies
├── bun.lock                     # Bun v2 lockfile
├── tsconfig.json                # TypeScript compiler configuration (aliases, bundler resolution)
├── vite.config.ts               # Vite configuration (Tailwind v4, React plugin, @ alias)
├── vitest.config.ts             # Vitest configuration for unit & integration tests
├── Dockerfile                   # Multi-stage Docker build (oven/bun:1 base, non-root user)
├── docker-compose.yml           # Docker Compose configuration for one-command startup
├── .dockerignore                # Build context exclusion list
├── .env.example                 # Template for required and optional environment variables
│
├── extension/                   # Chrome Extension (Manifest V3 Job Clipper)
│   ├── manifest.json            # Extension metadata, permissions & shortcuts (Alt+Shift+J)
│   ├── popup.html               # Popup view markup (form, states, dark theme)
│   ├── popup.css                # Scoped Tailwind-inspired styling
│   ├── popup.js                 # Popup controller (DOM injection, duplicate check, API sync)
│   ├── extractor.js             # Content extractor injected into active browser tabs
│   └── README.md                # Installation and developer guide for the extension
│
├── prisma/
│   └── schema.prisma            # Prisma SQLite datasource & Application model definition
│
├── shared/                      # Shared domain layer (isolated from React / Express)
│   ├── types/
│   │   └── index.ts             # Domain contracts, enums & interfaces
│   └── utils/
│       ├── urlUtils.ts          # URL normalization & domain extraction
│       ├── timeline.ts          # Timeline state creation & stage transition logic
│       ├── portalDetector.ts    # Portal detection rules
│       └── metadataExtractor.ts # Job title & metadata deduction
│
├── server/                      # Backend implementation
│   ├── app.ts                   # Express application, CORS/PNA middleware & router mounts (isolated from entrypoint)
│   ├── config/
│   │   └── env.ts               # Environment variable parsing and defaults (ENV object)
│   ├── data/
│   │   └── sample-emails.ts     # Sample emails for testing inbox sync offline
│   ├── middleware/
│   │   └── validate.ts          # Generic Zod validation middleware for Express routes
│   ├── routes/
│   │   ├── applications.routes.ts # Applications CRUD & batch endpoints (/api/applications)
│   │   ├── auth.routes.ts       # OAuth initiation & popup callback handlers (Outlook, Gmail)
│   │   ├── emails.routes.ts     # Email sync, analysis, and status detection endpoints
│   │   ├── gemini.routes.ts     # Gemini direct endpoints & proxy
│   │   └── jobs.routes.ts       # Job parsing, batch processing, scraping endpoints
│   ├── schemas/
│   │   └── application.schema.ts # Zod validation schemas for applications CRUD & batch
│   └── services/
│       ├── db.service.ts        # Prisma database operations (CRUD, atomic batch, retry, safe JSON mapping)
│       ├── email-analyzer.service.ts # LLM + heuristic email classification
│       ├── email-sync.service.ts     # Strategy pattern for email providers (OutlookSyncStrategy, GmailSyncStrategy)
│       ├── gemini.service.ts         # Gemini client wrapper & prompts
│       ├── heuristics.service.ts     # Deterministic regex/text job metadata extractors
│       └── scraper.service.ts        # SSRF-protected webpage title/metadata fetcher with DNS verification
│
└── src/                         # Frontend implementation
    ├── main.tsx                 # React DOM mount point
    ├── App.tsx                  # Root component (routing, modals, layout, view switching)
    ├── index.css                # Tailwind v4 import (@import "tailwindcss";)
    ├── types.ts                 # Core application types (re-exports from shared/types)
    ├── components/
    │   ├── AppHeader.tsx        # Top navigation, sync status indicator, search, actions, theme toggle
    │   ├── JobKanban.tsx        # Kanban drag-and-drop board
    │   ├── JobTable.tsx         # Tabular data grid with sorting
    │   ├── JobGrid.tsx          # Card-based grid view
    │   ├── JobCalendar.tsx      # Chronological recruitment calendar
    │   ├── JobStats.tsx         # Visual summary metrics
    │   ├── JobModal.tsx         # Add/Edit application modal orchestrator
    │   ├── BatchAddModal.tsx    # Bulk job link parser modal
    │   ├── InboxSyncModal.tsx   # Email sync and status review modal
    │   ├── CsvImportModal.tsx   # CSV import mapping and duplicate detector
    │   ├── SettingsModal.tsx    # API keys, OAuth settings, and defaults
    │   ├── common/              # Atomic reusable UI components
    │   │   ├── StatusBadge.tsx  # Consistent recruitment status badge
    │   │   ├── PortalBadge.tsx  # Standardized recruitment portal badge
    │   │   └── JobActionButtons.tsx # Unified actions (edit, delete, external link, AI re-analyze)
    │   ├── job-modal/           # Decomposed JobModal sections & hooks
    │   │   ├── JobBasicInfoSection.tsx # Role, company, portal, URL, date, salary
    │   │   ├── JobSkillsSection.tsx    # Skill tags input and badges
    │   │   ├── JobTimelineSection.tsx  # Timeline stages list & interactive controls
    │   │   ├── JobDuplicateWarning.tsx # Accessible duplicate detection banner
    │   │   └── useJobModalForm.ts      # Form state, AI auto-fill & deferred duplicate checks
    │   ├── batch/               # Sub-components for batch processing
    │   ├── inbox/               # Sub-components for email sync tabs
    │   └── kanban/              # Kanban column & card components
    ├── hooks/
    │   ├── useApplications.ts   # Core state management (syncStatus, optimistic updates & fine-grained rollback)
    │   ├── useApplicationFilters.ts # Search, tag, date, and portal filtering
    │   ├── useBulkSelection.ts  # Multi-item selection for batch operations
    │   ├── useTheme.ts          # Light/Dark mode state management
    │   └── useToast.ts          # Notifications toast system
    ├── services/
    │   ├── api.ts               # Frontend HTTP client communicating with /api (typed error parsing, batchUpdate)
    │   ├── csvImport.service.ts # CSV parser, field detection, duplicate checks
    │   └── export.service.ts    # CSV and JSON exporter
    └── utils/
        ├── batchParser.ts       # Text line parser for batch URLs and titles
        ├── duplicateDetector.ts # Heuristics for detecting existing applications
        ├── linkParser.ts        # URL metadata extraction helpers
        ├── metadataExtractor.ts # Re-exports from shared/utils
        ├── portalDetector.ts    # Re-exports from shared/utils
        ├── statusConfig.ts      # Colors, labels, and icons for application statuses
        ├── timelineUtils.ts     # Re-exports from shared/utils
        └── urlUtils.ts          # Re-exports from shared/utils
```

---

## 4. Key Workflows & Scripts

Run these commands using `bun` (or `npm` if using `--legacy-peer-deps`):

```bash
# Start development server with HMR (Express + Vite middleware)
bun run dev

# Run unit and integration tests
bun run test

# Run tests in watch mode
bun run test:watch

# Typecheck codebase without emitting JS
bun run lint

# Compile production bundles (Vite client to dist/ + esbuild server to dist/server.cjs)
bun run build

# Start production server
bun run start

# Clean build artifacts
bun run clean
```

### Docker Commands
```bash
# Ensure local volume directory has write permissions for non-root container user (UID 1000: bun)
mkdir -p data && sudo chown -R 1000:1000 data && sudo chmod -R 775 data

# Build and start container in the background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop container
docker compose down
```

---

## 5. Development Principles & Conventions for Agents

### 1. Robust Fallbacks & Resilience
- When integrating with AI (Gemini) or external scrapers, **never fail hard** if the API key is missing, invalid, or rate-limited.
- Always implement and maintain deterministic heuristic fallbacks (see `heuristics.service.ts` and `heuristics.service.test.ts`).
- Server endpoints should return structured fallback data (e.g. `source: 'fallback'`) rather than 500 errors whenever possible.
- **Private Network Access (PNA) for Browser Extensions**: Preflight (`OPTIONS 204`) and all API responses must include `Access-Control-Allow-Private-Network: true` to prevent Chrome >= 142 Local Network Access blocks when clients query local/LAN IPs (e.g. `192.168.x.x`).
- **Endpoint Fallback**: Browser extensions and external clients querying modular routes (e.g. `/api/jobs/parse-job`) should include fallback to legacy paths (`/api/parse-job`) if a 404 response is encountered.

### 2. TypeScript & Imports
- Use path alias `@/*` mapping to `./*` as defined in `tsconfig.json` and `vite.config.ts`.
- Prefer strict typing. Avoid `any` where domain types (`JobApplication`, `ApplicationStatus`, etc.) exist in `shared/types`.
- When adding new server endpoints, mount them modularly in `server/routes/` rather than expanding `server.ts`.
- **Layer Isolation & Shared Domain Layer**: The backend (`server/`) **MUST NEVER** import from the frontend (`src/`). All shared domain models, interfaces, enums (`JobStatus`, `JobApplication`, `ApplicationTimelineEntry`, etc.) and pure utilities (`normalizeJobUrl`, `portalDetector`, `timeline` helpers) must reside in `shared/` (`shared/types/index.ts`, `shared/utils/*`). Frontend code in `src/` can import from `shared/`, and `src/types.ts` re-exports shared types for backward compatibility.

### 3. Frontend Architecture
- State persistence: User applications and settings reside in `localStorage` via custom hooks (`useApplications.ts`).
- UI consistency: Use Tailwind CSS utility classes and `lucide-react` icons. Maintain dark mode compatibility (`dark:` classes).
- Keep components focused. Decompose large modals into dedicated sub-components within subdirectories (like `components/batch/`, `components/inbox/`, or `components/job-modal/`).
- Use atomic reusable components (`StatusBadge`, `PortalBadge`, `JobActionButtons`) from `src/components/common/` rather than re-implementing badge colors and action buttons inline.

### 4. Testing & Verification
- Unit test files are located alongside their respective source files using the `*.test.ts` naming convention.
- When modifying business logic (parsers, filters, services), run existing tests with `bun run test` or `vitest run` and add corresponding test coverage.

### 5. Docker & Production Environment
- In production (`NODE_ENV=production`), `server.ts` serves static assets from `path.join(process.cwd(), 'dist')`.
- The server listens internally on `0.0.0.0:3000`. The host port defaults to **3050** (`${HOST_PORT:-3050}:3000`, `APP_URL=http://localhost:3050`) to avoid conflicts on self-hosted Proxmox nodes.
- The `/api/health` endpoint is used by Docker `HEALTHCHECK`. Keep this endpoint fast and free of external dependencies.
- **Persistent SQLite storage & permissions**: Storage is mounted via Docker volume: `./data:/app/data`. The runner container runs as user `bun` (UID 1000). Host `./data` must be writable by UID 1000 (`sudo chown -R 1000:1000 data && sudo chmod -R 775 data`) to prevent SQLite `Error code 14: Unable to open the database file`.
- **Multi-stage Bun builds**: Avoid running `bun install --production` in the runner stage — Bun enforces frozen lockfiles during dependency filtering even with `--no-frozen-lockfile`. Instead, install all dependencies in the builder stage and directly copy `node_modules` (`COPY --from=builder /app/node_modules ./node_modules`).
- **Bun Runtime Entrypoint Isolation**: In Bun v1.4+, when executing bundled entrypoints (e.g. `bun dist/server.cjs`), Bun's internal `bun:main` inspects exported properties (`isServerConfig(entryNamespace?.default)`). If `app` or server-like objects are exported from the entrypoint, Bun attempts to auto-serve via `Bun.serve()`, crashing Express with `TypeError: Bun.serve() needs either: a routes object or a fetch handler`. Therefore:
  - **`server.ts` MUST NEVER export any variables or functions.** It is strictly a self-executing entrypoint.
  - The Express app instance, middleware, and route registrations must reside in `server/app.ts`, which test files import directly (`import { app } from '../server/app'`).

### 6. Database & Persistence (Prisma + SQLite)
- The persistent SQLite database resides in `./data/tracker.db` (local dev) or `/app/data/tracker.db` (Docker container).
- Whenever modifying `prisma/schema.prisma`, always run `npx prisma generate` to rebuild `@prisma/client`.
- When adding new columns or changing schema in development, use `npx prisma db push`.
- Nested structured arrays (`skills`, `timeline`, `contacts`) are serialized to JSON text columns in SQLite. Always use `safeJsonParse` fallbacks in `server/services/db.service.ts` to prevent runtime crashes on malformed data.
- **Batch Operations & Concurrency Resilience**: Multi-record updates and inserts (e.g. `saveApplicationsBatch`, `updateApplicationsBatch`) must be wrapped in `prisma.$transaction` to guarantee atomicity. Concurrent SQLite writes can trigger `SQLITE_BUSY` or Prisma `P2034` transaction conflicts; always implement retries with exponential backoff (up to 3 attempts).
- **Client-Side Optimistic Rollback**: Frontend state in `useApplications.ts` uses optimistic updates for instant UI response, but must implement fine-grained per-entity rollback on server sync failure to prevent race conditions from overwriting unrelated application states.
- Frontend sync (`useApplications.ts`) transparently hydrates from `GET /api/applications` and bootstraps `localStorage` data to the backend database upon initial connection.

### 7. Git & Version Control Rules
- **Commits and inspection commands are fully pre-approved**: Committing (`git commit`), pulling (`git pull`), branching, local staging (`git add`), and revision checks like `git rev-parse HEAD` by both the main agent and subagents are pre-approved and do NOT require user confirmation or approval. Execute them automatically.
- **NEVER push changes (`git push`) without explicit, direct user request**. Pushing to remotes (`origin`, etc.) is strictly forbidden unless the user explicitly tells you to push.

### 8. AI Agent Tooling & Assets (.agents Directory)
- **Mandatory usage of repository agent tooling**: The repository contains a dedicated `.agents/` directory providing specialized rules, skills, subagent definitions, hooks, and workflows configured for this project.
- **Rules (`.agents/rules/`)**: AI agents working on the codebase MUST inspect and adhere to the relevant domain rule files before and during coding (e.g. `react-coding-style.md`, `typescript-coding-style.md`, `common-testing.md`, `common-security.md`, `bun-docker-troubleshoot.md`).
- **Skills (`.agents/skills/`)**: Proactively utilize available skills in `.agents/skills/` (such as `tdd-workflow` for test-driven development, `error-handling` for resilient API error patterns, `bun-docker-troubleshoot` for container/Bun runtime issues, and `production-audit` before releases).
- **Subagents (`.agents/agents/`)**: Proactively delegate to or consult specialized subagents (e.g. `typescript-reviewer`, `react-reviewer`, `code-reviewer`, `build-error-resolver`) for reviews, migrations, or troubleshooting.
- **Hooks (`.agents/hooks/` & `.agents/hooks.json`)**: All AI agents MUST comply with project lifecycle hooks, including safety gates (e.g. GateGuard fact-forcing before commands and file edits) and session state tracking.

### 9. Data Extraction Quality & UI Scope Isolation
- Inspect and strictly adhere to `.agents/rules/data-extraction-quality.md`.
- **Defense in Depth for Metadata Extraction**: Every external or generative extraction pipeline (Scraper -> Regex/LLM -> API Route -> UI/Extension Form) must sanitize, validate, and bound data at each layer. Never assume an upstream layer produced safe or clean output.
- **Salary & Metadata Isolation**: Fields like `salary` must strictly be <= 70 characters and contain only numeric compensation figures, currencies (`PLN`, `zł`, `EUR`, etc.), and contract qualifiers (`B2B`, `UoP`, `+ VAT`). Never leak job offer descriptions, duties, benefits (`Multisport`, `Medicover`), or multi-line text into discrete metadata fields.
- **Scraper Text Boundaries**: Always preserve HTML block tags (`<br>`, `</p>`, `</div>`, `</li>`, headings) as line breaks (`\n`) before stripping tags. NEVER collapse an entire document's whitespace into a single line (`\s+ -> ' '`).
- **UI View Scope Boundaries**: Adding features or stage tracking to one view (e.g. Calendar/Timeline) must NEVER alter or pollute unrelated views (e.g. Table) with unsolicited badges or metadata. Table rows must remain clean, dense, and easily scanable.

### 10. Security & Input Validation (SSRF & Zod)
- **SSRF Defense with DNS Verification**: Any endpoint fetching user-provided or external URLs (`scraper.service.ts`) must pass through `isSafeUrl`. It performs asynchronous DNS lookup (`dns.promises.lookup`) and rejects localhost, private networks (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), link-local / cloud metadata (`169.254.0.0/16`), IPv6 loopback / unique local / mapped IPv4 addresses, and unresolvable domains. This mitigates DNS rebinding and cloud credential theft.
- **Express Input Validation via Zod**: All mutable API endpoints (`POST`, `PUT`, `DELETE` with payload) must validate `req.body` using Zod schemas (`server/schemas/`) and the `validateBody` middleware (`server/middleware/validate.ts`). Schemas must strip unexpected keys (never use `.passthrough()`) to prevent mass assignment and prototype pollution. Catch blocks must log error details internally and return sanitized JSON messages without leaking stack traces.

### 11. Extensible Email Sync (Strategy Pattern)
- **Strategy Pattern for Providers**: Email integrations (`server/services/email-sync.service.ts`) implement the `EmailSyncStrategy` interface (`OutlookSyncStrategy`, `GmailSyncStrategy`), resolved via `getEmailSyncStrategy(provider)`.
- **Payload Optimization**: When fetching messages from Gmail API, always request metadata format (`format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`) rather than `format=full`, reducing network bandwidth and avoiding memory spikes from large MIME attachments.
