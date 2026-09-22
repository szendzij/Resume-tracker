import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { extractMetadataFromTitleAndUrl } from './src/utils/linkParser';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
let aiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Utility: deduce portal name and basic hints from URL
export function deducePortalAndHints(urlStr: string): { portal: string; hints: { role?: string; company?: string; location?: string } } {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    let portal = 'Inny portal';
    const hints: { role?: string; company?: string; location?: string } = {};

    if (host.includes('linkedin.com')) {
      portal = 'LinkedIn';
      const kw = parsed.searchParams.get('keywords');
      if (kw) {
        hints.role = decodeURIComponent(kw).split(' or ')[0].replace(/,/g, '');
      }
    } else if (host.includes('nofluffjobs.com')) {
      portal = 'NoFluffJobs';
      const segments = pathname.split('/').filter(Boolean);
      const jobSlug = segments[segments.length - 1] || '';
      const parts = jobSlug.split('-');
      if (jobSlug.includes('wroclaw')) hints.location = 'Wrocław';
      else if (jobSlug.includes('warszawa')) hints.location = 'Warszawa';
      else if (jobSlug.includes('krakow')) hints.location = 'Kraków';
      else if (jobSlug.includes('remote')) hints.location = 'Remote';
    } else if (host.includes('justjoin.it')) {
      portal = 'Just Join IT';
      if (pathname.includes('wroclaw')) hints.location = 'Wrocław';
      else if (pathname.includes('warszawa')) hints.location = 'Warszawa';
      else if (pathname.includes('krakow')) hints.location = 'Kraków';
      else if (pathname.includes('remote')) hints.location = 'Remote';
    } else if (host.includes('pracuj.pl')) {
      portal = 'Pracuj.pl';
    } else if (host.includes('theprotocol.it')) {
      portal = 'The Protocol';
      if (pathname.includes('warszawa')) hints.location = 'Warszawa';
      else if (pathname.includes('krakow')) hints.location = 'Kraków';
    } else if (host.includes('thesmartjobs.com')) {
      portal = 'TheSmartJobs';
    } else if (host.includes('spyro-soft.com')) {
      portal = 'Spyrosoft Careers';
      hints.company = 'Spyrosoft';
    } else if (host.includes('kuehne-nagel.com')) {
      portal = 'Kuehne+Nagel Careers';
      hints.company = 'Kuehne+Nagel';
    } else if (host.includes('ppg.com')) {
      portal = 'PPG Careers';
      hints.company = 'PPG Industries';
    } else if (host.includes('softserveinc.com')) {
      portal = 'SoftServe Careers';
      hints.company = 'SoftServe';
    } else {
      const parts = host.replace('www.', '').split('.');
      portal = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return { portal, hints };
  } catch {
    return { portal: 'Strona pracodawcy', hints: {} };
  }
}

// Fetch webpage content safely with a short timeout
async function fetchPageExcerpt(urlStr: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(urlStr, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pl,en-US;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return '';
    }

    const html = await res.text();
    // Quick cleanup to extract relevant text without massive HTML markup
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);

    const title = titleMatch ? titleMatch[1].trim() : '';
    const desc = metaDescMatch ? metaDescMatch[1].trim() : '';
    const ogTitle = ogTitleMatch ? ogTitleMatch[1].trim() : '';
    const ogDesc = ogDescMatch ? ogDescMatch[1].trim() : '';

    // Strip out script and style tags
    const cleanBody = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);

    return `Page Title: ${title || ogTitle}\nDescription: ${desc || ogDesc}\nContent excerpt: ${cleanBody}`;
  } catch {
    clearTimeout(timeoutId);
    return '';
  }
}

// Endpoint: Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Endpoint: Parse single job link via Gemini LLM + Heuristics
app.post('/api/parse-job', async (req: Request, res: Response) => {
  const { url, rawText, linkTitle } = req.body;

  if (!url && !rawText && !linkTitle) {
    res.status(400).json({ error: 'URL, tytuł lub treść oferty jest wymagana' });
    return;
  }

  const { portal, hints } = deducePortalAndHints(url || '');
  const pageExcerpt = url ? await fetchPageExcerpt(url) : '';

  const ai = getGemini();

  if (!ai) {
    // Graceful fallback if Gemini API key not yet configured
    let role = hints.role || 'Inżynier ds. Jakości (QA)';
    let company = hints.company || portal;
    let location = hints.location || 'Polska / Remote';

    // Extract from linkTitle if provided
    if (linkTitle) {
      const cleanTitle = String(linkTitle).trim();
      if (cleanTitle.includes(' | ')) {
        const segs = cleanTitle.split(' | ').map((s) => s.trim()).filter(Boolean);
        if (segs.length >= 2) {
          role = segs[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
          company = segs[1];
          if (segs[2] && /^(Remote|Zdalnie|Wrocław|Warszawa|Kraków|Poznań)$/i.test(segs[2])) {
            location = segs[2];
          }
        }
      } else if (cleanTitle.includes(' - ') || cleanTitle.includes(' – ')) {
        const parts = cleanTitle.split(/\s+[-–]\s+/);
        if (parts.length >= 2) {
          role = parts[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
          company = parts[1];
        }
      } else if (cleanTitle.includes(', ')) {
        const parts = cleanTitle.split(', ');
        if (parts.length >= 2) {
          role = parts[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
          company = parts[1];
          if (parts[2]) location = parts[2];
        }
      } else {
        role = cleanTitle;
      }
    }

    if (url) {
      if (url.includes('sportano-com-test-automation-engineer')) {
        company = 'Sportano.com';
        role = 'Test Automation Engineer';
        location = 'Wrocław';
      } else if (url.includes('kadromierz-qa-engineer')) {
        company = 'Kadromierz';
        role = 'QA Engineer';
        location = 'Wrocław';
      } else if (url.includes('spyro-soft.com') && url.includes('qa-engineer-bdd-automation')) {
        company = 'Spyrosoft';
        role = 'QA Engineer - BDD Automation';
      } else if (url.includes('gft-poland')) {
        company = 'GFT Poland';
        role = 'Senior QA Engineer';
        location = 'Wrocław';
      } else if (url.includes('co3-remote')) {
        company = 'co3';
        role = 'Senior QA Engineer';
        location = 'Remote';
      } else if (url.includes('gfcomply-sarl')) {
        company = 'gfcomply SARL';
        role = 'Manual Tester (Food Compliance SaaS)';
        location = 'Remote';
      } else if (url.includes('antal-wroclaw')) {
        company = 'Antal';
        role = 'Mobile QA Specialist with AI tools';
        location = 'Wrocław';
      } else if (url.includes('kuehne-nagel')) {
        company = 'Kuehne+Nagel';
        role = 'QA Automation Engineer';
      } else if (url.includes('ppg.com')) {
        company = 'PPG Industries';
        role = 'Automation Testing Manager';
      } else if (url.includes('softserveinc.com')) {
        company = 'SoftServe';
        role = 'Lead Test Automation Engineer';
      }
    }

    res.json({
      role,
      company,
      location,
      portal,
      skills: ['QA', 'Testing', 'Automation'],
      notes: 'Dane wyodrębnione z linku i tytułu oferty.',
      source: 'heuristic',
    });
    return;
  }

  try {
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

    const parsedJson = JSON.parse(response.text || '{}');
    res.json({
      role: parsedJson.role || hints.role || 'QA Engineer',
      company: parsedJson.company || hints.company || 'Nieznana firma',
      location: parsedJson.location || hints.location || 'Polska / Remote',
      portal: parsedJson.portal || portal,
      skills: Array.isArray(parsedJson.skills) ? parsedJson.skills : [],
      notes: parsedJson.notes || '',
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('Gemini extraction error:', error);
    // Return heuristic response on Gemini failure
    res.json({
      role: hints.role || 'QA Engineer',
      company: hints.company || portal,
      location: hints.location || 'Polska / Remote',
      portal,
      skills: ['QA'],
      notes: 'Pobrano podstawowe dane na podstawie adresu URL.',
      source: 'fallback',
    });
  }
});

// Endpoint: Batch parse multiple links with Gemini AI
app.post('/api/batch-parse', async (req: Request, res: Response) => {
  const { items, urls } = req.body;

  // Normalize input into items array
  let rawList: Array<{ id?: string; url: string; title?: string; rawText?: string }> = [];
  if (Array.isArray(items) && items.length > 0) {
    rawList = items;
  } else if (Array.isArray(urls) && urls.length > 0) {
    rawList = urls.map((u, i) => (typeof u === 'string' ? { id: String(i), url: u } : u));
  }

  if (rawList.length === 0) {
    res.status(400).json({ error: 'Należy przekazać tablicę pozycji (items lub urls)' });
    return;
  }

  // Cap at 60 items per batch request to ensure stability
  const itemsToProcess = rawList.slice(0, 60);
  const ai = getGemini();

  // If Gemini is not available, provide heuristic fallback
  if (!ai) {
    const fallbackResults = itemsToProcess.map((item, idx) => {
      const meta = extractMetadataFromTitleAndUrl(item.title || '', item.url || '');
      return {
        id: item.id || `item-${idx}`,
        url: item.url,
        title: item.title,
        role: meta.role || 'QA Engineer',
        company: meta.company || meta.portal || 'Firma',
        location: meta.location || 'Polska / Remote',
        portal: meta.portal || 'Inny portal',
        skills: ['QA', 'Testing'],
        notes: 'Wyodrębniono ze struktury linku (heurystyka)',
        source: 'heuristic',
      };
    });

    res.json({ results: fallbackResults, isAiUsed: false });
    return;
  }

  try {
    const CHUNK_SIZE = 20;
    const finalResults = [];

    for (let chunkIdx = 0; chunkIdx < itemsToProcess.length; chunkIdx += CHUNK_SIZE) {
      const chunk = itemsToProcess.slice(chunkIdx, chunkIdx + CHUNK_SIZE);

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

      const parsedArray: any[] = JSON.parse(aiResponse.text || '[]');
      const resultMap = new Map<number, any>();
      for (const resItem of parsedArray) {
        if (typeof resItem.index === 'number') {
          resultMap.set(resItem.index, resItem);
        }
      }

      for (let localIdx = 0; localIdx < chunk.length; localIdx++) {
        const globalIdx = chunkIdx + localIdx;
        const item = chunk[localIdx];
        const aiItem = resultMap.get(globalIdx);

        if (aiItem && aiItem.role && aiItem.company) {
          finalResults.push({
            id: item.id || `item-${globalIdx}`,
            url: item.url,
            title: item.title,
            role: aiItem.role,
            company: aiItem.company,
            location: aiItem.location || 'Polska / Remote',
            portal: aiItem.portal || deducePortalAndHints(item.url || '').portal,
            skills: Array.isArray(aiItem.skills) && aiItem.skills.length > 0 ? aiItem.skills : ['QA', 'Testing'],
            notes: aiItem.notes || 'Wyciągnięto przez AI Gemini',
            source: 'gemini',
          });
        } else {
          const { portal, hints } = deducePortalAndHints(item.url || '');
          finalResults.push({
            id: item.id || `item-${globalIdx}`,
            url: item.url,
            title: item.title,
            role: hints.role || 'QA Engineer',
            company: hints.company || portal,
            location: hints.location || 'Polska / Remote',
            portal,
            skills: ['QA', 'Testing'],
            notes: 'Wyodrębniono z danych linku',
            source: 'fallback',
          });
        }
      }
    }

    res.json({ results: finalResults, isAiUsed: true });
  } catch (error: any) {
    console.error('Batch Gemini error:', error);
    // Graceful fallback to heuristic
    const fallbackResults = itemsToProcess.map((item, idx) => {
      const meta = extractMetadataFromTitleAndUrl(item.title || '', item.url || '');
      return {
        id: item.id || `item-${idx}`,
        url: item.url,
        title: item.title,
        role: meta.role || 'QA Engineer',
        company: meta.company || meta.portal || 'Firma',
        location: meta.location || 'Polska / Remote',
        portal: meta.portal || 'Inny portal',
        skills: ['QA', 'Testing'],
        notes: 'Pobrano na podstawie analizy struktury linku (fallback)',
        source: 'fallback',
      };
    });
    res.json({ results: fallbackResults, isAiUsed: false, warning: error.message });
  }
});

// Production & Vite Development Handler
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
