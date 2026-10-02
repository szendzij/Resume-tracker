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
├── prisma/
│   └── schema.prisma            # Prisma SQLite datasource & Application model definition
│
├── server/                      # Backend implementation
│   ├── config/
│   │   └── env.ts               # Environment variable parsing and defaults (ENV object)
│   ├── data/
│   │   └── sample-emails.ts     # Sample emails for testing inbox sync offline
│   ├── routes/
│   │   ├── applications.routes.ts # Applications CRUD & batch endpoints (/api/applications)
│   │   ├── auth.routes.ts       # OAuth initiation & popup callback handlers (Outlook, Gmail)
│   │   ├── emails.routes.ts     # Email sync, analysis, and status detection endpoints
│   │   ├── gemini.routes.ts     # Gemini direct endpoints & proxy
│   │   └── jobs.routes.ts       # Job parsing, batch processing, scraping endpoints
│   └── services/
│       ├── db.service.ts        # Prisma database operations (CRUD, batch, safe JSON mapping)
│       ├── email-analyzer.service.ts # LLM + heuristic email classification
│       ├── email-sync.service.ts     # Graph API / Gmail API fetching logic
│       ├── gemini.service.ts         # Gemini client wrapper & prompts
│       ├── heuristics.service.ts     # Deterministic regex/text job metadata extractors
│       └── scraper.service.ts        # Lightweight webpage title/metadata fetcher
│
└── src/                         # Frontend implementation
    ├── main.tsx                 # React DOM mount point
    ├── App.tsx                  # Root component (routing, modals, layout, view switching)
    ├── index.css                # Tailwind v4 import (@import "tailwindcss";)
    ├── types.ts                 # Core application types (JobApplication, Status, Filter, etc.)
    ├── components/
    │   ├── AppHeader.tsx        # Top navigation, search, actions, theme toggle
    │   ├── JobKanban.tsx        # Kanban drag-and-drop board
    │   ├── JobTable.tsx         # Tabular data grid with sorting
    │   ├── JobGrid.tsx          # Card-based grid view
    │   ├── JobStats.tsx         # Visual summary metrics
    │   ├── JobModal.tsx         # Add/Edit application modal
    │   ├── BatchAddModal.tsx    # Bulk job link parser modal
    │   ├── InboxSyncModal.tsx   # Email sync and status review modal
    │   ├── CsvImportModal.tsx   # CSV import mapping and duplicate detector
    │   ├── SettingsModal.tsx    # API keys, OAuth settings, and defaults
    │   ├── batch/               # Sub-components for batch processing
    │   ├── inbox/               # Sub-components for email sync tabs
    │   └── kanban/              # Kanban column & card components
    ├── hooks/
    │   ├── useApplications.ts   # Core state management (localStorage persistence, CRUD)
    │   ├── useApplicationFilters.ts # Search, tag, date, and portal filtering
    │   ├── useBulkSelection.ts  # Multi-item selection for batch operations
    │   ├── useTheme.ts          # Light/Dark mode state management
    │   └── useToast.ts          # Notifications toast system
    ├── services/
    │   ├── api.ts               # Frontend HTTP client communicating with /api
    │   ├── csvImport.service.ts # CSV parser, field detection, duplicate checks
    │   └── export.service.ts    # CSV and JSON exporter
    └── utils/
        ├── batchParser.ts       # Text line parser for batch URLs and titles
        ├── duplicateDetector.ts # Heuristics for detecting existing applications
        ├── linkParser.ts        # URL metadata extraction helpers
        ├── metadataExtractor.ts # Clean title, company, and role deduction
        ├── portalDetector.ts    # Detection of portals (Pracuj.pl, NoFluffJobs, LinkedIn, etc.)
        ├── statusConfig.ts      # Colors, labels, and icons for application statuses
        └── urlUtils.ts          # Normalization and domain extraction
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

### 2. TypeScript & Imports
- Use path alias `@/*` mapping to `./*` as defined in `tsconfig.json` and `vite.config.ts`.
- Prefer strict typing. Avoid `any` where domain types (`JobApplication`, `ApplicationStatus`, etc.) exist in `src/types.ts`.
- When adding new server endpoints, mount them modularly in `server/routes/` rather than expanding `server.ts`.

### 3. Frontend Architecture
- State persistence: User applications and settings reside in `localStorage` via custom hooks (`useApplications.ts`).
- UI consistency: Use Tailwind CSS utility classes and `lucide-react` icons. Maintain dark mode compatibility (`dark:` classes).
- Keep components focused. Decompose large modals into dedicated sub-components within subdirectories (like `components/batch/` or `components/inbox/`).

### 4. Testing & Verification
- Unit test files are located alongside their respective source files using the `*.test.ts` naming convention.
- When modifying business logic (parsers, filters, services), run existing tests with `bun run test` or `vitest run` and add corresponding test coverage.

### 5. Docker & Production Environment
- In production (`NODE_ENV=production`), `server.ts` serves static assets from `path.join(process.cwd(), 'dist')`.
- The server listens internally on `0.0.0.0:3000`. The host port defaults to **3050** (`${HOST_PORT:-3050}:3000`, `APP_URL=http://localhost:3050`) to avoid conflicts on self-hosted Proxmox nodes.
- The `/api/health` endpoint is used by Docker `HEALTHCHECK`. Keep this endpoint fast and free of external dependencies.
- Persistent SQLite storage is mounted via Docker volume: `./data:/app/data`. The runner container runs as user `bun` and must retain ownership of `/app/data`.

### 6. Database & Persistence (Prisma + SQLite)
- The persistent SQLite database resides in `./data/tracker.db` (local dev) or `/app/data/tracker.db` (Docker container).
- Whenever modifying `prisma/schema.prisma`, always run `npx prisma generate` to rebuild `@prisma/client`.
- When adding new columns or changing schema in development, use `npx prisma db push`.
- Nested structured arrays (`skills`, `timeline`, `contacts`) are serialized to JSON text columns in SQLite. Always use `safeJsonParse` fallbacks in `server/services/db.service.ts` to prevent runtime crashes on malformed data.
- Frontend sync (`useApplications.ts`) transparently hydrates from `GET /api/applications` and bootstraps `localStorage` data to the backend database upon initial connection.

### 7. Git & Version Control Rules
- **NEVER push changes (`git push`) without explicit, direct user request**.
- Committing (`git commit`), pulling (`git pull`), branching, and local staging (`git add`) are allowed, but pushing to remotes (`origin`, etc.) is strictly forbidden unless the user explicitly tells you to push.
