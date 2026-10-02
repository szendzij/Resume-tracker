# Resume Tracker – Chrome Extension (Job Clipper)

Oficjalne rozszerzenie przeglądarki Chrome (Manifest V3) dla aplikacji **Resume Tracker**. Umożliwia błyskawiczne pobieranie i zapisywanie ofert pracy bezpośrednio z przeglądanych stron (Pracuj.pl, NoFluffJobs, LinkedIn, JustJoin.it itp.) do lokalnej lub sieciowej instancji Resume Tracker (np. na serwerze Proxmox).

---

## 🚀 Funkcje

- **1-Click Clip**: Automatyczne pobranie adresu URL, tytułu strony oraz zaznaczonego lub pełnego tekstu ogłoszenia.
- **Skrót klawiszowy**: Szybkie otwarcie okna popup za pomocą skrótu `Alt+Shift+J`.
- **Wsparcie dla sieci lokalnej (PNA)**: Pełna kompatybilność z instancjami uruchomionymi w sieci domowej / LAN (np. `http://192.168.x.x:3050` na Proxmoxie).
- **Fallback Resilience**: Działa płynnie nawet w przypadku braku lub limitów klucza API Gemini (analiza heurystyczna na backendzie).

---

## 📦 Instalacja w Google Chrome / Brave / Edge

1. Otwórz przeglądarkę i przejdź pod adres:
   ```
   chrome://extensions
   ```
2. W prawym górnym rogu włącz przełącznik **Tryb dewelopera** (Developer mode).
3. Kliknij przycisk **Wczytaj rozpakowane** (Load unpacked) w lewym górnym rogu.
4. W oknie wyboru wskaż folder `extension` z tego repozytorium:
   ```
   Resume-tracker/extension
   ```
5. Rozszerzenie **Resume Tracker - Job Clipper** pojawi się na liście zainstalowanych dodatków. Przypnij je do paska narzędzi ikoną pinezki.

---

## ⚙️ Konfiguracja adresu instancji (Proxmox / Localhost)

Domyślnie rozszerzenie łączy się z adresem `http://localhost:3050`. Jeśli Twoja instancja Resume Tracker działa na maszynie wirtualnej lub kontenerze Proxmox w sieci lokalnej:

1. Kliknij ikonę rozszerzenia na pasku zadań lub naciśnij skrót `Alt+Shift+J`.
2. Kliknij ikonę ustawień (lub przejdź do sekcji konfiguracji w oknie popup).
3. Podaj adres URL swojej instancji serwera, np.:
   ```
   http://192.168.1.150:3050
   ```
4. Zapisz ustawienia. Adres zostanie zachowany w pamięci `chrome.storage.sync`.

---

## ⌨️ Skróty klawiszowe

| Skrót | Akcja |
|---|---|
| `Alt+Shift+J` | Otwórz okno popup Job Clipper na aktywnej karcie |

> Skrót można zmienić w dowolnym momencie pod adresem: `chrome://extensions/shortcuts`.

---

## 🛠️ Generowanie ikon

Ikony rozszerzenia są generowane programowo za pomocą skryptu:
```bash
node extension/generate-icons.cjs
```
Skrypt generuje ikony PNG o rozmiarach 16x16, 48x48 oraz 128x128 w katalogu `extension/icons/`.

---

## 🔒 Uprawnienia (Permissions)

- `activeTab`: Dostęp do adresu URL i tytułu aktualnie przeglądanej karty w momencie kliknięcia rozszerzenia.
- `scripting`: Możliwość pobrania tekstu ogłoszenia z otwartej strony.
- `storage`: Przechowywanie konfiguracji adresu URL serwera i preferencji użytkownika.
- `host_permissions` (`http://*/*`, `https://*/*`): Komunikacja z dowolnym adresem instancji Resume Tracker (zarówno `localhost`, domeny publiczne, jak i adresy IP sieci lokalnej).
