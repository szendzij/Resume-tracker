import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env';
import { withRetry } from './retry';
import { batchParseResponseConfig, singleJobResponseConfig } from './gemini-schemas';

let aiClient: GoogleGenAI | null = null;

export function getGemini(customKey?: string): GoogleGenAI | null {
  const key = (customKey && customKey.trim()) || ENV.GEMINI_API_KEY;
  if (!key) return null;

  if (customKey && customKey.trim()) {
    return new GoogleGenAI({
      apiKey: customKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: ENV.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function validateGeminiApiKey(apiKey?: string): Promise<{
  valid: boolean;
  model: string;
  response?: string;
  error?: string;
}> {
  const key = (apiKey && apiKey.trim()) || ENV.GEMINI_API_KEY;
  if (!key) {
    return {
      valid: false,
      model: ENV.GEMINI_MODEL,
      error: 'Brak klucza API do przetestowania.',
    };
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const res = await ai.models.generateContent({
      model: ENV.GEMINI_MODEL,
      contents: 'Odpowiedz tylko jednym słowem: "POŁĄCZONO".',
    });

    return {
      valid: true,
      model: ENV.GEMINI_MODEL,
      response: res.text?.trim() || 'POŁĄCZONO',
    };
  } catch (error: any) {
    let cleanMessage = error.message || 'Wystąpił błąd podczas walidacji klucza Gemini API.';
    try {
      const parsed = JSON.parse(cleanMessage);
      if (parsed?.error?.message) {
        cleanMessage = parsed.error.message;
      }
    } catch {
      // Keep original message if not JSON
    }

    return {
      valid: false,
      model: ENV.GEMINI_MODEL,
      error: cleanMessage,
    };
  }
}

export interface ParseJobParams {
  url?: string;
  portal: string;
  linkTitle?: string;
  hints: { role?: string; company?: string; location?: string };
  rawText?: string;
  pageExcerpt?: string;
}

export async function parseSingleJobWithGemini(ai: GoogleGenAI, params: ParseJobParams) {
  const { url, portal, linkTitle, hints, rawText, pageExcerpt } = params;

  const prompt = `Analizujesz ofertę pracy, na którą użytkownik wysłał CV lub którą chce zapisać.
Link oferty: ${url || 'Brak linku'}
Portal ogłoszeniowy: ${portal}
${linkTitle ? `Tytuł z linku / strony: "${linkTitle}"` : ''}
Wskazówki z linku: ${JSON.stringify(hints)}
${rawText ? `Treść oferty / zaznaczony tekst ze strony:\n${rawText}` : ''}
${pageExcerpt ? `Pobrany fragment strony oferty:\n${pageExcerpt}` : ''}

Zidentyfikuj i wyodrębnij w języku polskim:
1. "role": Dokładna nazwa stanowiska/roli z nagłówka oferty (np. "Senior IT Automation Tester (Python + Robot Framework)", "Senior QA Engineer", "Lead Test Automation Engineer", "QA Engineer - BDD Automation"). Usuń dopiski typu "Oferta pracy", "(k/m)", "(m/f/d)".
2. "company": Rzeczywista nazwa zatrudniającej firmy/pracodawcy (np. "Optiveum", "Spyrosoft", "GFT Poland", "Sportano.com", "Kadromierz", "Kuehne+Nagel", "PPG", "SoftServe"). 
   BARDZO WAŻNE: NIGDY nie wpisuj nazwy portalu ogłoszeniowego (np. "The Protocol", "Pracuj.pl", "NoFluffJobs", "LinkedIn", "Just Join IT") jako firmy! Szukaj etykiety "Firma:", "Pracodawca:" lub nazwy w tytule/treści.
3. "location": Lokalizacja miasta lub kraju (np. "Gdańsk", "Wrocław", "Warszawa", "Kraków", "Polska").
4. "salary": Tylko i wyłącznie zwięzła kwota/widełki wynagrodzenia oraz waluta i okres (np. "120 - 120 zł netto (+ VAT) / godz.", "18 000 - 24 000 PLN", "120 zł/h B2B"). Maksymalnie 50 znaków. BARDZO WAŻNE: NIGDY nie wklejaj tu opisu oferty, wymagań, technologii ani żadnej treści ogłoszenia! Jeśli brak wynagrodzenia w ofercie, wpisz pusty ciąg "".
5. "workType": Tryb świadczenia pracy: dokładnie jedno z: "Zdalnie", "Hybrydowo" lub "Stacjonarnie". Jeśli oferta wspomina o pracy hybrydowej (np. "tryb pracy: hybrydowa"), wybierz "Hybrydowo".
6. "portal": Nazwa portalu (np. "The Protocol", "LinkedIn", "NoFluffJobs", "Just Join IT", "Pracuj.pl" itp.).
7. "skills": Tablica głównych wymaganych technologii i narzędzi wymienionych w ofercie (np. ["Python", "Robot Framework", "SQL", "Jenkins", "Git", "Jira", "Selenium"]).
8. "notes": Krótka notatka podsumowująca kluczowe parametry oferty (max 1 zdanie).`;

  const isTransient = (err: any): boolean =>
    err?.status === 503 ||
    err?.status === 429 ||
    err?.message?.includes('503') ||
    err?.message?.includes('high demand') ||
    err?.message?.includes('rate limit');

  return withRetry(
    async () => {
      const response = await ai.models.generateContent({
        model: ENV.GEMINI_MODEL,
        contents: prompt,
        config: singleJobResponseConfig,
      });

      return JSON.parse(response.text || '{}');
    },
    { attempts: 3, baseDelayMs: 800, isRetryable: isTransient }
  );
}

export async function parseBatchChunkWithGemini(
  ai: GoogleGenAI,
  chunk: Array<{ id?: string; url: string; title?: string; rawText?: string }>,
  chunkIdx: number
) {
  const promptItems = chunk
    .map((item, localIdx) => {
      const globalIdx = chunkIdx + localIdx;
      return `[Index ${globalIdx}]
Tytuł/Tekst z linku: ${item.title || '(brak tytułu)'}
URL: ${item.url}
${item.rawText ? `Dodatkowe informacje: ${item.rawText}` : ''}`;
    })
    .join('\n\n');

  const prompt = `Jesteś zaawansowanym rekruterem i ekspertem rynku IT. Analizujesz listę ${chunk.length} ofert pracy, na które kandydat wysłał zgłoszenie.

Dla KAŻDEJ pozycji wyodrębnij precyzyjnie w języku polskim:
- "index": liczbę całkowitą [Index X] odpowiadającą danej ofercie.
- "role": dokładną, oczyszczoną nazwę roli/stanowiska (np. "Senior QA Engineer", "QA Engineer (BDD & Automation)", "Lead Test Automation Engineer", "Manual Tester", "Mobile QA Specialist", "Automation Testing Manager"). Usuń dopiski typu "Oferta pracy", "(m/f/d)", "k/m".
- "company": dokładną, rzeczywistą nazwę zatrudniającej firmy (np. "Spyrosoft", "CO3", "Sportano.com", "GFT Poland", "Kadromierz", "PPG", "Kuehne+Nagel", "Comarch", "Etteplan", "Trading 212", "Focal Systems", "Samsung Food", "SoftServe", "Ailleron", "Poczta Polska", "NTT DATA", "ProService Finteco", "DevsData", "Intellias", "Nagarro", "Moniepoint Group", "eConsulting", "Hays"). NIGDY nie wpisuj ogólnego portalu ogłoszeniowego (np. No Fluff Jobs, LinkedIn, Pracuj.pl) jako firmy, chyba że ogłoszenie jest bezpośrednio do pracy w LinkedIn czy Pracuj.pl.
- "location": miasto lub tryb pracy (np. "Wrocław", "Warszawa", "Kraków", "Poznań", "Remote", "Zdalnie", "Hybrydowo").
- "portal": portal źródłowy lub strona karier (np. "No Fluff Jobs", "Just Join IT", "LinkedIn", "the:protocol", "Pracuj.pl", "Strona karier").
- "skills": tablicę 2-5 głównych technologii i umiejętności wymaganych na tym stanowisku (np. ["Playwright", "Cypress", "Selenium", "Python", "BDD", "API", "Jira", "TypeScript"]).
- "notes": krótką notatkę informacyjną (np. "Wymagane BDD i automatyzacja", "Tryb zdalny / B2B").

Lista ofert do przeanalizowania:
${promptItems}`;

  const aiResponse = await ai.models.generateContent({
    model: ENV.GEMINI_MODEL,
    contents: prompt,
    config: batchParseResponseConfig,
  });

  return JSON.parse(aiResponse.text || '[]') as any[];
}
