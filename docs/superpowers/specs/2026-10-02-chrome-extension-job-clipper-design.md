# Specyfikacja Projektowa: Wtyczka Chrome (Job Clipper) dla Resume Tracker

*Data utworzenia:* 2026-10-02  
*Status:* Do wdrożenia  
*Środowisko docelowe:* Chrome Manifest V3, Node.js / Bun, Express 4, Proxmox (sieć domowa / LAN)

---

## 1. Wprowadzenie i Cel Projektu

Celem projektu jest rozszerzenie systemu **Resume Tracker** o dedykowaną wtyczkę do przeglądarki Google Chrome (Manifest V3). Wtyczka pozwala użytkownikowi podczas przeglądania ofert pracy na dowolnym portalu (LinkedIn, Pracuj.pl, Just Join IT, NoFluffJobs, portale firmowe ATS) na:
1. Pobranie danych oferty z aktywnej karty jednym kliknięciem (lub skrótem `Alt+Shift+J`).
2. Analizę treści oferty przez backend Resume Tracker (Gemini AI z automatycznym fallbackiem do heurystyk).
3. Wykrycie potencjalnych duplikatów w bazie danych.
4. Prezentację ustrukturyzowanego formularza w oknie Popup (z możliwością korekty pól: stanowisko, firma, widełki, lokalizacja, umiejętności, status).
5. Podjęcie decyzji: zapisanie jako nowa aplikacja ze statusem **„Do zaaplikowania”** / **„Wysłana”** lub zaktualizowanie istniejącego wpisu w bazie.

Aplikacja Resume Tracker jest hostowana w lokalnej sieci na serwerze **Proxmox** (np. `http://192.168.x.x:3050`), co wymaga obsługi mechanizmów **Chrome Local / Private Network Access (PNA)** oraz CORS.

---

## 2. Architektura Systemu i Przepływ Danych

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRZEGLĄDARKA CHROME                             │
│                                                                        │
│  ┌───────────────────────┐             ┌────────────────────────────┐  │
│  │     Aktywna Karta     │             │       Wtyczka Chrome       │  │
│  │  (np. LinkedIn /      │             │      (extension/popup)     │  │
│  │   Pracuj.pl)          │             │                            │  │
│  │                       │             │  • Skrót Alt+Shift+J       │  │
│  │   ┌───────────────┐   │  execute    │  • Review Form             │  │
│  │   │ extractor.js  │ ◀─┼─────────────┼─ • Duplicate Warning       │  │
│  │   │ (DOM / tekst) │ ──┼────────────▶│  • Settings (Proxmox IP)   │  │
│  │   └───────────────┘   │             └──────────────┬─────────────┘  │
└──────────────────────────┼────────────────────────────┼────────────────┘
                           │                            │ HTTP Fetch
                           │                            │ (CORS + PNA)
                           ▼                            ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    SERWER PROXMOX (Resume Tracker)                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Express API (server.ts)                                          │  │
│  │  • Middleware CORS + Access-Control-Allow-Private-Network        │  │
│  │  • GET  /api/health                     (Test łączności)         │  │
│  │  • POST /api/jobs/parse-job             (Gemini AI / Heurystyki) │  │
│  │  • GET  /api/applications               (Weryfikacja duplikatów) │  │
│  │  • POST /api/applications               (Zapis nowej oferty)     │  │
│  │  • PUT  /api/applications/:id           (Aktualizacja wpisu)     │  │
│  └──────────────────┬───────────────────────────────────────────────┘  │
│                     │                                                  │
│                     ▼                                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Baza Danych SQLite (Prisma ORM)                                  │  │
│  │  • Tabela Application (obsługa nowego statusu 'Do zaaplikowania')│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Struktura Katalogów i Modułów

Wtyczka będzie samodzielnym podsystemem w katalogu `extension/`, napisanym w czystym, lekkim Vanilla TypeScript/JS i nowoczesnym CSS (bez skomplikowanych bundlerów, natychmiast gotowa do załadowania w trybie deweloperskim Chrome):

```
Resume-tracker/
├── extension/
│   ├── manifest.json         # Manifest V3 (uprawnienia, commands, popup)
│   ├── popup.html            # Struktura UI okienka (widoki: loading, form, success, settings)
│   ├── popup.css             # Style dark/light mode spójne z aplikacją
│   ├── popup.js              # Logika okienka, stan, komunikacja z API, storage
│   ├── extractor.js          # Skrypt wstrzykiwany do aktywnej karty
│   ├── icons/                # Rzeczywiste ikony PNG
│   │   ├── icon-16.png
│   │   ├── icon-48.png
│   │   └── icon-128.png
│   ├── generate-icons.cjs    # Skrypt generatora ikon PNG
│   └── README.md             # Instrukcja instalacji i podłączenia z Proxmoxem
├── server.ts                 # Rozszerzenie o CORS i Private Network Access
├── src/
│   ├── types.ts              # Dodanie statusu 'Do zaaplikowania' do JobStatus
│   └── utils/
│       └── statusConfig.ts   # Konfiguracja kolorów i etykiety 'Do zaaplikowania'
└── ...
```

---

## 4. Szczegóły Komponentów Wtyczki

### 4.1. Manifest V3 (`extension/manifest.json`)
* **Wersja manifestu:** 3
* **Uprawnienia (`permissions`):**
  * `"activeTab"` – bezpieczny dostęp do otwartej karty po kliknięciu ikony lub skrócie.
  * `"scripting"` – wstrzyknięcie `extractor.js` w bieżący kontekst DOM.
  * `"storage"` – trwały zapis adresu instancji Proxmox w `chrome.storage.sync`.
* **Uprawnienia sieciowe (`host_permissions`):**
  * `["http://*/*", "https://*/*"]` – umożliwia `fetch()` do adresu IP serwera Proxmox (`http://192.168.x.x:3050`).
* **Skróty klawiszowe (`commands`):**
  ```json
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+Shift+J",
        "mac": "Alt+Shift+J"
      },
      "description": "Otwórz Resume Tracker Job Clipper"
    }
  }
  ```
* **Ikony:** jawnie wygenerowane pliki `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`.

### 4.2. Ekstraktor Treści (`extension/extractor.js`)
* Skrypt uruchamiany dynamicznie przez `chrome.scripting.executeScript`.
* **Krok 1 (Zaznaczenie użytkownika):** Sprawdza `window.getSelection()?.toString()?.trim()`. Jeśli użytkownik zaznaczył tekst na stronie, jest on przekazywany jako główna treść.
* **Krok 2 (Filtrowanie DOM):** Gdy nic nie zaznaczono:
  * Klonuje lub analizuje węzły, ignorując elementy szumu: `script, style, noscript, nav, header, footer, aside, svg, iframe, form`.
  * Szuka kontenera: `main, article, [role="main"], .job-description, #job-details, body`.
  * Pobiera wyczyszczony tekst (ograniczony do pierwszych 7 000 znaków dla optymalizacji tokenów Gemini).
* **Krok 3 (Metadane):** Zbiera `document.title`, `window.location.href` oraz tagi meta (`og:title`, `og:description`).
* Zwraca obiekt `{ url, title, rawText, selectedText }`.

### 4.3. Logika i Interfejs Popupu (`popup.html`, `popup.css`, `popup.js`)
Obsługuje 4 stany widoku (State Machine):
1. **Widok Ładowania (Loading View):**
   * Wyświetla animowany loader: *„Pobieram dane oferty i analizuję przez AI...”*.
   * Prezentuje wykryty portal (np. LinkedIn, Pracuj.pl, Just Join IT).
2. **Główny Formularz Weryfikacji (Review Form):**
   * **Nagłówek:** Logo Resume Tracker, wskaźnik połączenia z Proxmoxem (zielona dioda = Online), przycisk ⚙️ Ustawienia.
   * **Baner Duplikatu (jeśli wykryto):**
     * Żółty alert: *„⚠️ Oferta istnieje już w Twojej bazie (Status: [Status], Data: [Data])”*.
     * Podwójny przycisk akcji w stopce: **„Zaktualizuj istniejący”** oraz **„Zapisz jako nowy”**.
   * **Pola edytowalne:**
     * Stanowisko / Rola (`role`)
     * Firma (`company`)
     * Lokalizacja (`location`) + pigułki trybu pracy (*Zdalnie*, *Hybrydowo*, *Biuro*)
     * Widełki wynagrodzenia (`salary`)
     * Portal (`portal`)
     * Status początkowy: przełącznik między **„Do zaaplikowania”** (domyślny) a **„Wysłana”**
     * Umiejętności / Tagi: interaktywne chipy z opcją usuwania (`×`) i dopisywania nowych
     * Notatki (`notes`): podsumowanie AI z wymaganiami i benefitami
     * Przełącznik: **„Dołącz pełną treść ogłoszenia do notatek”** (archiwalna kopia oferty)
   * **Przycisk zapisu:** „💾 Zapisz w Resume Tracker”.
3. **Widok Sukcesu (Success View):**
   * Zielony komunikat: *„Oferta pomyślnie zapisana!”*.
   * Przycisk: *„Otwórz w Resume Tracker”* (otwiera kartę aplikacji na Proxmoxie).
   * Przycisk: *„Zamknij”*.
4. **Widok Ustawień (Settings View):**
   * Dostępny po kliknięciu ⚙️.
   * Pole: **Adres serwera Resume Tracker** (domyślnie: `http://localhost:3050`, użytkownik wpisuje np. `http://192.168.1.150:3050`).
   * Przycisk **„Testuj połączenie”**: wysyła `GET /api/health` i pokazuje wynik testu w czasie rzeczywistym.
   * Opcjonalny klucz Gemini API Key.
   * Zapis do `chrome.storage.sync`.

---

## 5. Zmiany w Aplikacji Backend / Frontend

### 5.1. Backend Express (`server.ts`)
* **Obsługa CORS i Chrome Private Network Access:**
  ```ts
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');
    res.header('Access-Control-Allow-Private-Network', 'true');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });
  ```
  Nagłówek `Access-Control-Allow-Private-Network: true` zapobiega blokowaniu zapytań przez mechanizm Local Network Access w przeglądarkach Chrome $\ge$ 142.

### 5.2. Nowy Status: `Do zaaplikowania`
* **`src/types.ts`:**
  Rozszerzenie typu `JobStatus`:
  ```ts
  export type JobStatus =
    | 'Do zaaplikowania'
    | 'Wysłana'
    | 'Weryfikacja CV'
    | 'Rozmowa HR'
    | 'Rozmowa techniczna'
    | 'Zadanie rekrutacyjne'
    | 'Oferta'
    | 'Odrzucona'
    | 'Zrezygnowano';
  ```
* **`src/utils/statusConfig.ts`:**
  Dodanie konfiguracji koloru, plakietki i opisu dla `'Do zaaplikowania'`:
  * Kolor: fioletowo-szary / indygo (`bg-slate-100 dark:bg-slate-800`, akcent `indigo`).
  * Opis: *„Zapisana oferta, oczekuje na przygotowanie i wysłanie CV”*.

---

## 6. Obsługa Błędów i Odporność (Resilience)

1. **Brak łączności z serwerem na Proxmoxie:**
   * Wtyczka przechwytuje wyjątek sieciowy `Failed to fetch`.
   * Prezentuje ekran: *„Brak połączenia z Resume Tracker pod adresem [URL]”*.
   * Umożliwia natychmiastowe przejście do ustawień lub ponowienie próby.
   * Treść wyciągnięta ze strony jest zapamiętywana w stanie popupu, by użytkownik jej nie utracił.
2. **Brak klucza Gemini / Błąd limitu AI:**
   * Backend przełącza się na analizę heurystyczną (`extractHeuristicJob`).
   * Zwraca dane z flagą `source: 'fallback'`.
   * Formularz we wtyczce wyświetla podstawowe dane (stanowisko, firma, portal wyciągnięte ze struktury URL/tytułu) z możliwością ręcznego dopisania reszty.
3. **Karty systemowe i zabronione (`chrome://`, `chrome-extension://`):**
   * Wykrycie adresu karty przed próbą wstrzyknięcia skryptu.
   * Komunikat z prośbą o przejście na stronę z ogłoszeniem o pracę.

---

## 7. Plan Weryfikacji i Testów

1. **Backend:**
   * Uruchomienie istniejących testów (`bun run test`).
   * Weryfikacja odpowiedzi nagłówków `OPTIONS` i `GET /api/health` pod kątem `Access-Control-Allow-Private-Network`.
2. **Wtyczka w Chrome:**
   * Wygenerowanie ikon PNG skryptem `generate-icons.cjs`.
   * Załadowanie folderu `extension/` w `chrome://extensions` w trybie deweloperskim.
   * Weryfikacja działania skrótu klawiszowego `Alt+Shift+J`.
   * Test parsowania oferty na rzeczywistych portalach (Pracuj.pl, NoFluffJobs, LinkedIn).
   * Test ostrzeżenia o duplikacie i zapisu do bazy.
   * Test połączenia z adresem `localhost:3050` oraz adresem IP w sieci LAN.
