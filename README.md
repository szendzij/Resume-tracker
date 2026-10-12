# 🚀 Resume Tracker

> **Resume Tracker** is a modern, full-stack web application and Chrome Extension suite designed to organize, track, and automate job hunting workflows. Powered by Google Gemini AI with deterministic heuristic fallbacks, it extracts structured job details from URLs or raw text, clips job postings directly from your browser, and synchronizes with your email inbox (Outlook / Gmail) to keep application statuses and timelines up to date.

---

## ✨ Key Features

### 📊 Multi-View Application Dashboard
- **Kanban Board**: Drag-and-drop applications across recruitment stages (*Applied, Screening, Interviewing, Offer, Rejected, Archived*).
- **Data Table**: High-density, scannable tabular grid with full-text search, multi-column sorting, bulk selection, and tag filtering.
- **Card Grid**: Clean visual overview with color-coded status badges, portal indicators, and quick action shortcuts.
- **Interactive Recruitment Calendar**: Track deadlines, interview dates, and stage transitions across **Month**, **Week**, and **Agenda** views.
- **Application Stage Timeline**: Chronological tracking of every stage transition with customizable dates and history inside the application modal.
- **Analytics & Metrics**: Real-time pipeline statistics, response rates, and visual distribution charts.

### 🧩 Chrome Extension (Manifest V3 Job Clipper)
- **1-Click Job Clipping**: Extract job postings directly from active browser tabs (LinkedIn, Pracuj.pl, NoFluffJobs, JustJoin.it, Indeed, etc.) using `Alt+Shift+J`.
- **Step-by-Step Progress Checklist**: Real-time visual feedback during DOM content extraction, AI/heuristic parsing, and duplicate verification.
- **Smart Duplicate Detection**: Automatically checks normalized URLs and Company + Role combinations against your database before saving.
- **Interactive Pre-Save Editor**: Review and edit extracted role, company, salary, work mode (*Remote, Hybrid, On-site*), skill tags, and notes right inside the popup.
- **LAN & Self-Hosted Ready**: Full support for Private Network Access (PNA CORS) to connect seamlessly with local or Proxmox/LAN instances (e.g., `http://192.168.x.x:3050`).

### 🤖 AI-Powered Job Extraction & Defense-in-Depth Heuristics
- **Google Gemini Integration**: Uses `@google/genai` (configurable via `GEMINI_MODEL`, defaulting to `gemini-3.5-flash-lite`) with automatic retry on transient `503` errors.
- **Deterministic Heuristics Fallback**: Built-in regex, JSON-LD, and DOM metadata parsers ensure extraction works offline, without an API key, or when rate-limited.
- **Strict Metadata Isolation**: Defense-in-depth sanitization across Scraper, Regex/LLM, API, and UI layers—preserving HTML block boundaries, isolating clean compensation strings (`<= 70` chars), and deduplicating skill tags.

### 📬 Email Synchronization & Classification
- **OAuth 2.0 Inbox Sync**: Connects to **Microsoft Outlook** (Microsoft Graph API) and **Google Gmail** (Gmail API) via secure OAuth popup flows, plus manual email text pasting.
- **Extensible Strategy Pattern**: Modular provider architecture (`OutlookSyncStrategy`, `GmailSyncStrategy`) using lightweight metadata-only fetches (`format=metadata`) to minimize bandwidth and memory usage.
- **Automated Status Detection**: Classifies incoming recruiter emails into interview invitations, rejections, or application confirmations and links them to existing applications.

### 🛡️ Enterprise-Grade Security, Data Integrity & Accessibility
- **SSRF & DNS Rebinding Protection**: Deep URL validation (`isSafeUrl`) with asynchronous DNS resolution (`dns.promises.lookup`) blocking localhost, RFC 1918 private networks, link-local/cloud metadata (`169.254.0.0/16`), and IPv6 mapped addresses.
- **Strict Schema Validation**: Express mutation routes (`POST`, `PUT`, `DELETE`) validated with **Zod** (`server/schemas/`), stripping unknown properties to prevent mass assignment and prototype pollution.
- **Atomic SQLite Transactions**: Batch creations and updates run inside `prisma.$transaction` with exponential backoff retries on `SQLITE_BUSY` / `P2034` concurrency locks.
- **Optimistic UI with Fine-Grained Rollback**: Instant client-side state updates backed by per-entity rollback on sync failure and a live header synchronization status indicator.
- **Accessible by Design (WCAG)**: Semantic ARIA roles (`role="status"`, `aria-live="polite"`), accessible duplicate alerts, keyboard navigation, and full Light/Dark theme support.

### ⚡ Batch Processing & CSV/JSON Portability
- **Bulk Link Ingestion**: Paste dozens of job URLs or raw descriptions at once for automated batch parsing.
- **CSV Import & Export**: Flexible CSV importer with automatic column mapping and duplicate detection, plus one-click export to CSV or JSON.

---

## 🛠️ Tech Stack

### Frontend (`src/`)
- **Framework**: [React 19](https://react.dev/)
- **Bundler & Dev Server**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) (`@tailwindcss/vite`)
- **Animations**: [Motion](https://motion.dev/) (Framer Motion)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Shared Domain Layer (`shared/`)
- **Domain Contracts**: Single source of truth in `shared/types/index.ts` enforcing strict layer isolation between backend and frontend.
- **Pure Utilities**: Shared URL normalization (`urlUtils.ts`), timeline stage management (`timeline.ts`), portal detection (`portalDetector.ts`), and metadata extraction (`metadataExtractor.ts`).

### Backend (`server/`)
- **Framework**: [Express 4](https://expressjs.com/) (isolated in `server/app.ts` from the self-executing `server.ts` entrypoint for Bun v1.4+ compatibility)
- **Database & ORM**: SQLite (`tracker.db`) via [Prisma ORM](https://www.prisma.io/) (`@prisma/client` v6)
- **Validation**: [Zod v4](https://zod.dev/) request validation middleware
- **AI SDK**: [Google Gen AI SDK](https://github.com/google/generative-ai-js) (`@google/genai`)
- **Runtime & Bundler**: [Bun](https://bun.sh/) / [Node.js 20+](https://nodejs.org/) (`tsx` in development, `esbuild` for production builds)
- **Testing**: [Vitest](https://vitest.dev/) with `@testing-library/react` and `jsdom`

---

## 📁 Project Structure

```text
Resume-tracker/
├── server.ts                    # Self-executing Express entrypoint (serves API & Vite/static dist)
├── package.json                 # Scripts, dependencies, and build configuration
├── Dockerfile                   # Multi-stage Docker build (oven/bun:1 base, non-root user)
├── docker-compose.yml           # One-command container orchestration (default port 3050)
├── .env.example                 # Environment variables template
│
├── extension/                   # Chrome Extension (Manifest V3 Job Clipper)
│   ├── manifest.json            # Extension metadata, permissions & Alt+Shift+J shortcut
│   ├── popup.html               # Popup UI (step-by-step loading checklist, form, settings)
│   ├── popup.css                # Scoped dark-theme styling
│   ├── popup.js                 # Popup controller (extraction, duplicate check, API sync)
│   ├── extractor.js             # Content script injected into active job board tabs
│   └── README.md                # Extension installation and usage guide
│
├── prisma/
│   └── schema.prisma            # Prisma SQLite datasource & Application model definition
│
├── shared/                      # Shared domain layer (isolated from React & Express)
│   ├── types/
│   │   └── index.ts             # Domain contracts, enums & interfaces
│   └── utils/                   # URL normalization, timeline helpers, portal & metadata rules
│
├── server/                      # Backend implementation
│   ├── app.ts                   # Express app, PNA CORS middleware & route registration
│   ├── config/
│   │   └── env.ts               # Environment variable parsing and defaults (ENV)
│   ├── data/
│   │   └── sample-emails.ts     # Sample recruiter emails for offline inbox testing
│   ├── middleware/
│   │   └── validate.ts          # Generic Zod validation middleware
│   ├── routes/                  # Modular API routers (applications, auth, emails, gemini, jobs)
│   ├── schemas/
│   │   └── application.schema.ts # Zod schemas for CRUD and batch mutations
│   └── services/                # DB (Prisma), Email Sync (Strategy), Scraper (SSRF-safe), Gemini, Heuristics
│
└── src/                         # Frontend implementation
    ├── App.tsx                  # Root component (layout, view switching, modals)
    ├── components/
    │   ├── AppHeader.tsx        # Navigation, sync status indicator, search, theme toggle
    │   ├── JobKanban.tsx        # Drag-and-drop Kanban board
    │   ├── JobTable.tsx         # High-density sortable table view
    │   ├── JobGrid.tsx          # Visual card grid view
    │   ├── JobCalendar.tsx      # Interactive recruitment calendar (Month, Week, Agenda)
    │   ├── JobStats.tsx         # Pipeline analytics and metrics
    │   ├── JobModal.tsx         # Add/Edit application modal orchestrator
    │   ├── BatchAddModal.tsx    # Bulk job URL/text parser modal
    │   ├── InboxSyncModal.tsx   # Email sync and status review modal
    │   ├── CsvImportModal.tsx   # CSV column mapper and duplicate detector
    │   ├── SettingsModal.tsx    # API keys, AI model config, and OAuth settings
    │   ├── common/              # Atomic UI components (StatusBadge, PortalBadge, JobActionButtons)
    │   ├── job-modal/           # Decomposed modal sections & useJobModalForm hook
    │   ├── batch/               # Batch processing sub-components
    │   ├── inbox/               # Email sync tab sub-components
    │   └── kanban/              # Kanban columns and draggable cards
    ├── hooks/                   # Custom hooks (useApplications, useApplicationFilters, useBulkSelection, useTheme, useToast)
    ├── services/                # Frontend HTTP client (api.ts), CSV import & export services
    └── utils/                   # Client utilities, duplicate detection, status styling
```

---

## 🚀 Getting Started

### Prerequisites
- **[Bun](https://bun.sh/)** (v1.1+ recommended) or **Node.js** (v20+ / v22+)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/szend/Resume-tracker.git
cd Resume-tracker

# Install dependencies using Bun (recommended)
bun install

# Or using npm
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

Adjust the configuration in `.env` as needed:

```env
# Optional but recommended: Google Gemini API key for AI extraction & email analysis
GEMINI_API_KEY="your_gemini_api_key_here"

# Optional: Override default Gemini model (defaults to gemini-3.5-flash-lite)
GEMINI_MODEL="gemini-3.5-flash-lite"

# Host port for Docker mapping (defaults to 3050)
HOST_PORT="3050"

# Public or local application URL (used for OAuth callbacks)
APP_URL="http://localhost:3050"

# SQLite database path (local dev default: file:./data/tracker.db)
DATABASE_URL="file:./data/tracker.db"

# Optional: Microsoft Outlook OAuth 2.0 Integration
MICROSOFT_CLIENT_ID="your_azure_client_id"
MICROSOFT_CLIENT_SECRET="your_azure_client_secret"

# Optional: Google Gmail OAuth 2.0 Integration
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

> **Note**: If `GEMINI_API_KEY` is omitted, the application seamlessly falls back to deterministic regex and DOM heuristics for job and email parsing. You can also provide a custom Gemini API key directly in the web UI Settings or Chrome Extension popup.

### 3. Initialize Database & Start Development Server

```bash
# Generate Prisma client and push SQLite schema
npx prisma generate
npx prisma db push

# Start development server with HMR (Express + Vite middleware)
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `bun run dev` | Starts development server with HMR (`tsx server.ts` + Vite middleware) |
| `bun run build` | Verifies entrypoint isolation, generates Prisma client, builds Vite frontend to `dist/`, and bundles server to `dist/server.cjs` |
| `bun run start` | Starts the compiled production server (`node dist/server.cjs`) |
| `bun run test` | Runs unit and integration test suites via Vitest |
| `bun run test:watch` | Runs Vitest in interactive watch mode |
| `bun run test:smoke` | Runs production build & server healthcheck smoke test |
| `bun run check:entrypoint` | Verifies `server.ts` exports nothing (prevents Bun v1.4+ `Bun.serve` auto-serve crash) |
| `bun run lint` | Runs TypeScript type checking (`tsc --noEmit`) |
| `bun run clean` | Removes build artifacts (`dist/`) |

---

## 🐳 Running with Docker

The project includes a multi-stage `Dockerfile` based on `oven/bun:1` running as a non-root user (`bun`, UID `1000`) with persistent SQLite storage.

```bash
# 1. Ensure local data directory is writable by container user (UID 1000) on Linux hosts
mkdir -p data && sudo chown -R 1000:1000 data && sudo chmod -R 775 data

# 2. Build and start container in detached mode
docker compose up -d --build

# 3. View container logs
docker compose logs -f

# 4. Stop container
docker compose down
```

By default, the containerized app is available at [http://localhost:3050](http://localhost:3050) (configurable via `HOST_PORT` in `.env`). Container health is monitored automatically via `GET /api/health`.

---

## 🧩 Chrome Extension Setup

To clip jobs directly from your browser into Resume Tracker, load the unpacked extension from the [`extension/`](./extension) directory:

1. Open `chrome://extensions` in Chrome, Brave, or Edge.
2. Enable **Developer mode** in the top-right corner.
3. Click **Load unpacked** and select the `Resume-tracker/extension` folder.
4. Press `Alt+Shift+J` on any job posting to clip and save it.

For full configuration details (including LAN/Proxmox setup and custom API keys), see [`extension/README.md`](./extension/README.md).

---

## 📄 License

This project is licensed under the MIT License.
