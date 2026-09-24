import { GoogleGenAI, Type } from '@google/genai';
import { ENV } from '../config/env';

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
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
      contents: 'Odpowiedz tylko jednym słowem: "POŁĄCZONO".',
    });

    return {
      valid: true,
      model: 'gemini-3.8-flash',
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
      model: 'gemini-3.8-flash',
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

  const prompt = `Analizujesz ofertę pracy, na którą użytkownik wysłał CV.
Link oferty: ${url || 'Brak linku'}
Portal: ${portal}
${linkTitle ? `Tytuł z linku (np. Markdown [Tytuł](link)): "${linkTitle}"` : ''}
Wskazówki z linku: ${JSON.stringify(hints)}
${rawText ? `Dodatkowy tekst oferty podany przez użytkownika:\n${rawText}` : ''}
${pageExcerpt ? `Pobrany fragment strony oferty:\n${pageExcerpt}` : ''}

Zidentyfikuj i wyodrębnij w języku polskim:
1. "role": Dokładna nazwa stanowiska/roli (np. "Senior QA Engineer", "Lead Test Automation Engineer", "QA Engineer - BDD Automation", "Automation Testing Manager").
2. "company": Nazwa firmy/pracodawcy (np. "Spyrosoft", "GFT Poland", "Sportano.com", "Kadromierz", "Kuehne+Nagel", "PPG", "SoftServe", "Antal", "gfcomply SARL").
3. "location": Lokalizacja (np. "Wrocław", "Warszawa", "Kraków", "Remote", "Hybrydowo").
4. "portal": Nazwa portalu (np. "LinkedIn", "NoFluffJobs", "Just Join IT", "Pracuj.pl", "The Protocol", "Kuehne+Nagel Careers" itp.).
5. "skills": Tablica głównych technologii/kompetencji (np. ["Selenium", "Python", "Playwright", "BDD", "API", "Jira"]).
6. "notes": Krótka uwaga lub podsumowanie (max 1 zdanie).`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, description: 'Nazwa stanowiska' },
          company: { type: Type.STRING, description: 'Nazwa firmy' },
          location: { type: Type.STRING, description: 'Lokalizacja pracy' },
          portal: { type: Type.STRING, description: 'Portal rekrutacyjny lub źródło' },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Główne wymagane umiejętności lub technologie',
          },
          notes: { type: Type.STRING, description: 'Krótkie podsumowanie lub notatka' },
        },
        required: ['role', 'company', 'portal'],
      },
    },
  });

  return JSON.parse(response.text || '{}');
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
    model: 'gemini-3.8-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            role: { type: Type.STRING },
            company: { type: Type.STRING },
            location: { type: Type.STRING },
            portal: { type: Type.STRING },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            notes: { type: Type.STRING },
          },
          required: ['index', 'role', 'company'],
        },
      },
    },
  });

  return JSON.parse(aiResponse.text || '[]') as any[];
}
