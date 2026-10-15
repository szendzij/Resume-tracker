# 🧩 Resume Tracker – Chrome Extension (Job Clipper)

> Official Manifest V3 browser extension for **Resume Tracker**. Instantly clip, parse, and save job postings directly from any job board (LinkedIn, Pracuj.pl, NoFluffJobs, JustJoin.it, Indeed, etc.) into your local or self-hosted Resume Tracker instance.

---

## 🇵🇱 Krótkie podsumowanie (Brief PL)

Oficjalna wtyczka przeglądarkowa (Chrome / Brave / Edge, Manifest V3) dla aplikacji **Resume Tracker**:
- ⚡ **1-Click Job Clipping (`Alt+Shift+J`)**: Błyskawiczne pobieranie adresu URL, tytułu oraz treści ogłoszenia z aktywnej karty przeglądarki.
- 📋 **Lista postępu na żywo (Step-by-Step Checklist)**: Wizualny podgląd każdego etapu przetwarzania (pobieranie treści DOM, analiza AI / heurystyczna, weryfikacja duplikatów).
- 🔍 **Wykrywanie duplikatów**: Automatyczne sprawdzanie znormalizowanego URL oraz pary *Firma + Stanowisko* przed zapisem, z opcją szybkiego podglądu istniejącej aplikacji.
- ✏️ **Edycja przed zapisem**: Możliwość korekty stanowiska, firmy, widełek płacowych, trybu pracy (*Remote / Hybrid / On-site*), tagów umiejętności (`Skills`) oraz notatek bezpośrednio w oknie popup.
- 🌐 **Wsparcie dla LAN / Proxmox (PNA CORS)**: Pełna kompatybilność z instancjami w sieci lokalnej (np. `http://192.168.x.x:3050`) oraz opcja podania własnego klucza Gemini API.

---

## ✨ Key Features

- **1-Click Job Extraction**: Automatically captures the page URL, title, structured JSON-LD metadata, and job description text from the active tab via `extractor.js`.
- **Interactive Loading Checklist**: Real-time step-by-step status indicators:
  1. *Extracting page content*
  2. *Analyzing job details (Gemini AI / Heuristic fallback)*
  3. *Checking for existing duplicates*
- **Smart Duplicate Prevention**: Normalizes job URLs (stripping UTM/tracking parameters) and compares both the URL and case-insensitive `Company + Role` against your Resume Tracker database to prevent duplicate entries.
- **Rich Pre-Save Form**: Edit extracted fields (`Role`, `Company`, `Portal`, `Status`, `Salary`, `Work Type` pills, interactive `Skills` badges, and `Notes`) before saving.
- **Local Network & Self-Hosted Ready (PNA)**: Works seamlessly with `localhost` as well as LAN/Proxmox servers (`http://192.168.x.x:3050`) thanks to Private Network Access (`Access-Control-Allow-Private-Network: true`) headers and automatic legacy endpoint fallback (`/api/jobs/parse-job` -> `/api/parse-job`).
- **Zero-Hard-Fail Resilience**: Supports an optional custom Gemini API key in extension settings and gracefully falls back to backend regex heuristics if no API key is configured or when rate limits occur.

---

## 📦 Installation (Chrome / Brave / Edge)

1. Open your browser and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable the **Developer mode** toggle in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension` directory inside this repository:
   ```text
   Resume-tracker/extension
   ```
5. Pin **Resume Tracker - Job Clipper** to your browser toolbar for one-click access.

### Generated artifact: `extension/vendor/urlUtils.js`

URL normalization (the rule that drives duplicate detection) lives in
`shared/utils/urlUtils.ts` — the single source of truth for both the backend and
this extension. The extension cannot import TypeScript, so the file is bundled:

```bash
npm run build:extension-vendor   # esbuild shared/utils/urlUtils.ts -> extension/vendor/urlUtils.js
```

That command also runs automatically before `vite build`. The generated file
**is committed** so that `Load unpacked` works from a fresh clone; if you edit
`shared/utils/urlUtils.ts`, regenerate it and commit the result — `npm test`
includes `tests/extension-url-parity.test.ts`, which fails when the two copies
disagree.

---

## ⚙️ Configuration (Localhost / LAN / Proxmox)

By default, the extension connects to `http://localhost:3050`. If your Resume Tracker instance runs on a different port or on a self-hosted LAN/Proxmox server:

1. Click the extension icon in the toolbar or press `Alt+Shift+J`.
2. Click the **Settings (gear)** icon in the top-right corner of the popup.
3. Configure your settings:
   - **Server URL**: Enter your instance URL, e.g.:
     ```text
     http://192.168.1.150:3050
     ```
   - **Gemini API Key (Optional)**: Provide a custom Google Gemini API key if your server does not have `GEMINI_API_KEY` configured in its environment.
4. Click **Save Settings**. Your configuration is persisted across sessions via `chrome.storage.sync`.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+J` | Open the Job Clipper popup and immediately extract the active tab |

> You can customize this shortcut anytime at `chrome://extensions/shortcuts`.

---

## 🛠️ Generating Extension Icons

Extension icons (`16x16`, `48x48`, `128x128` PNGs in `extension/icons/`) can be regenerated programmatically using:

```bash
node extension/generate-icons.cjs
```

---

## 🔒 Permissions Explained

- `activeTab`: Grants temporary access to the URL and DOM of the currently active tab when the user invokes the extension.
- `scripting`: Allows injecting `extractor.js` into the active tab to read job posting text and metadata.
- `storage`: Persists the user's Server URL and optional Gemini API Key in `chrome.storage.sync`.
- `host_permissions` (`http://*/*`, `https://*/*`): Enables API communication with self-hosted Resume Tracker instances on any local, LAN, or public domain.
