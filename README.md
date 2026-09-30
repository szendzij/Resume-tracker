# 🚀 Resume Tracker

> **Resume Tracker** is a modern, full-stack application designed to organize, track, and automate job hunting workflows. Powered by Google Gemini AI, it automatically extracts structured job details from URLs or raw text and synchronizes with your email inbox (Outlook / Gmail) to keep your application statuses up to date.

---

## 🇵🇱 Krótkie podsumowanie (PL)

**Resume Tracker** to kompleksowe narzędzie ułatwiające zarządzanie procesem poszukiwania pracy:
- 📊 **Wiele widoków**: Tablica Kanban (przeciągnij i upuść), tabela z wyszukiwaniem i sortowaniem, siatka kart oraz wizualne statystyki.
- 🤖 **Inteligentna analiza ofert (AI)**: Automatyczne parsowanie linków z portali ogłoszeniowych (np. Pracuj.pl, NoFluffJobs, LinkedIn, JustJoinIT) oraz czystego tekstu przy użyciu modelu Google Gemini.
- 📬 **Synchronizacja ze skrzynką e-mail**: Integracja z Microsoft Outlook i Google Gmail (OAuth 2.0) lub ręczne wklejanie treści e-maili do automatycznego wykrywania zaproszeń na rozmowy, potwierdzeń i odrzuceń.
- ⚡ **Masowy import i eksport**: Dodawanie wielu linków naraz (batch processing), import z plików CSV z wykrywaniem duplikatów i mapowaniem kolumn oraz eksport do CSV/JSON.
- 🐳 **Gotowość do wdrożenia**: Pełna konteneryzacja w środowisku Docker (multi-stage build z Bun).

---

## ✨ Key Features

- **Multi-View Application Dashboard**:
  - **Kanban Board**: Drag-and-drop applications across recruitment stages (*Applied, Screening, Interviewing, Offer, Rejected, Archived*).
  - **Data Table**: Full-text search, column sorting, pagination, and quick tag filters.
  - **Card Grid**: Clean visual overview with color-coded status badges and action shortcuts.
  - **Analytics & Metrics**: Real-time stats, conversion rates, and pipeline overview.
- **AI-Powered Job Extraction**:
  - Automatically parses job descriptions from URLs or pasted text using **Google Gemini** (`@google/genai`).
  - Extracts job title, company name, location, salary range, required skills, tags, and recruitment portal.
  - **Deterministic Heuristics Fallback**: Built-in regex and DOM parsers ensure metadata extraction works even without an API key or when rate limits occur.
- **Email Synchronization & Classification**:
  - Connects to **Microsoft Outlook** (Microsoft Graph API) and **Google Gmail** (Gmail API) via secure OAuth 2.0 popups.
  - Analyzes incoming recruiter emails to automatically detect status updates (interview invitations, rejections, acknowledgments).
- **Batch Processing & Ingestion**:
  - Paste dozens of job links or descriptions simultaneously; the background queue extracts and creates applications automatically.
- **CSV & JSON Import / Export**:
  - Flexible CSV importer with column auto-detection and duplicate application prevention.
  - One-click backup and export to standard CSV or JSON.
- **Dark Mode & Modern UI**:
  - Sleek design built with Tailwind CSS v4, smooth transitions powered by Framer Motion, and responsive layout.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/)
- **Bundler & Dev Server**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Animations**: [Motion](https://motion.dev/) (Framer Motion)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Backend
- **Framework**: [Express 4](https://expressjs.com/)
- **AI Engine**: [Google Gen AI SDK](https://github.com/google/generative-ai-js) (`@google/genai`)
- **Runtime**: [Bun](https://bun.sh/) / [Node.js](https://nodejs.org/) (executed with `tsx` in dev, bundled with `esbuild` for production)
- **Testing**: [Vitest](https://vitest.dev/) with `@testing-library/react` and `jsdom`

---

## 📁 Project Structure

```
Resume-tracker/
├── server.ts                    # Express entry point (serves API & Vite dev middleware / static dist)
├── package.json                 # Scripts and dependencies
├── Dockerfile                   # Multi-stage Docker build (oven/bun base)
├── docker-compose.yml           # Docker Compose configuration
├── .env.example                 # Environment variables template
│
├── server/                      # Backend implementation
│   ├── config/                  # Environment variable configuration
│   ├── data/                    # Sample data for offline testing
│   ├── routes/                  # Express API routes (auth, emails, gemini, jobs)
│   └── services/                # Gemini client, email sync, scraper & heuristics
│
└── src/                         # Frontend implementation
    ├── components/              # UI components (Kanban, Table, Grid, Modals)
    │   ├── batch/               # Batch link processing components
    │   ├── inbox/               # Email synchronization tabs
    │   └── kanban/              # Kanban columns and cards
    ├── hooks/                   # Custom React hooks (storage, filters, selection, theme)
    ├── services/                # API client, CSV import/export services
    └── utils/                   # Portal detector, metadata extractors, status config
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v20+ or v22+) or **Bun** (v1.0+)
- **npm** or **bun** package manager

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/szend/Resume-tracker.git
cd Resume-tracker

# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to configure your API keys:

```env
# Required for AI extraction & email analysis (Get key from Google AI Studio)
GEMINI_API_KEY="your_gemini_api_key_here"

# Application hosting URL (used for OAuth callbacks)
APP_URL="http://localhost:3000"

# Optional: Microsoft Outlook OAuth 2.0 Integration
MICROSOFT_CLIENT_ID="your_azure_client_id"
MICROSOFT_CLIENT_SECRET="your_azure_client_secret"

# Optional: Google Gmail OAuth 2.0 Integration
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

> **Note**: If `GEMINI_API_KEY` is not provided, the application automatically uses deterministic regex heuristics to extract job details offline.

### 3. Run Development Server

```bash
# Using Bun
bun run dev

# Or using npm
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `bun run dev` / `npm run dev` | Starts development server with HMR (Express + Vite) |
| `bun run build` / `npm run build` | Builds Vite frontend into `dist/` and compiles server with esbuild into `dist/server.cjs` |
| `bun run start` / `npm run start` | Starts the bundled production server |
| `bun run test` / `npm test` | Runs unit and integration test suite via Vitest |
| `bun run test:watch` | Runs tests in interactive watch mode |
| `bun run lint` / `npm run lint` | Runs TypeScript type checking without emitting files |
| `bun run clean` / `npm run clean` | Removes build directories (`dist/`) |

---

## 🐳 Running with Docker

You can spin up the entire application inside an isolated Docker container with one command:

```bash
# Build and run container in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop container
docker compose down
```

The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 🛡️ Resilience & Heuristic Fallbacks

Resume Tracker is designed with **zero-hard-fail** resilience:
- External API calls to Gemini are wrapped with automated fallbacks to regex heuristics.
- If scraping a job portal fails due to CORS or bot protection, lightweight metadata deduction falls back to domain-specific URL analysis.
- The server provides a fast `/api/health` endpoint for container health checks without any third-party service dependencies.

---

## 📄 License

This project is licensed under the MIT License.
