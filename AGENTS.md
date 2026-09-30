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
├── server/                      # Backend implementation
│   ├── config/
│   │   └── env.ts               # Environment variable parsing and defaults (ENV object)
│   ├── data/
│   │   └── sample-emails.ts     # Sample emails for testing inbox sync offline
│   ├── routes/
│   │   ├── auth.routes.ts       # OAuth initiation & popup callback handlers (Outlook, Gmail)
│   │   ├── emails.routes.ts     # Email sync, analysis, and status detection endpoints
│   │   ├── gemini.routes.ts     # Gemini direct endpoints & proxy
│   │   └── jobs.routes.ts       # Job parsing, batch processing, scraping endpoints
│   └── services/
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
- The server must listen on `0.0.0.0` (not `127.0.0.1`) to ensure accessibility inside Docker containers.
- The `/api/health` endpoint is used by Docker `HEALTHCHECK`. Keep this endpoint fast and free of external dependencies.
