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

// ==========================================
// EMAIL INBOX INTEGRATION (OUTLOOK & GMAIL)
// ==========================================

// Endpoint: Outlook OAuth URL
app.get('/api/auth/outlook/url', (req: Request, res: Response) => {
  const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.MICROSOFT_CLIENT_ID || process.env.OUTLOOK_CLIENT_ID || '';

  // Use Implicit/Token or Code response for Microsoft Graph Mail.Read
  const params = new URLSearchParams({
    client_id: clientId || 'sample-outlook-client-id',
    response_type: 'token',
    redirect_uri: redirectUri,
    scope: 'https://graph.microsoft.com/Mail.Read user.read openid profile',
    response_mode: 'fragment',
    state: 'provider=outlook',
  });

  const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

  res.json({
    url: authUrl,
    redirectUri,
    isConfigured: Boolean(clientId),
    provider: 'outlook',
  });
});

// Endpoint: Gmail OAuth URL
app.get('/api/auth/gmail/url', (req: Request, res: Response) => {
  const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || '';

  const params = new URLSearchParams({
    client_id: clientId || 'sample-google-client-id',
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'https://www.googleapis.com/auth/gmail.readonly email profile',
    include_granted_scopes: 'true',
    state: 'provider=gmail',
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

  res.json({
    url: authUrl,
    redirectUri,
    isConfigured: Boolean(clientId),
    provider: 'gmail',
  });
});

// OAuth Callback Handler (for both Outlook and Gmail popups)
app.get(['/auth/callback', '/auth/callback/'], (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <title>Autoryzacja skrzynki e-mail</title>
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        margin: 0;
        background: #0f172a;
        color: #f8fafc;
      }
      .card {
        text-align: center;
        padding: 2.5rem;
        background: #1e293b;
        border-radius: 1.25rem;
        border: 1px solid #334155;
        max-width: 440px;
        box-shadow: 0 20px 35px -10px rgba(0, 0, 0, 0.5);
      }
      .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgba(59, 130, 246, 0.25);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
        margin: 0 auto 1.25rem;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      h2 { margin: 0 0 0.5rem 0; font-size: 1.35rem; font-weight: 700; }
      p { color: #94a3b8; font-size: 0.95rem; margin: 0; line-height: 1.5; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="spinner"></div>
      <h2>Połączono ze skrzynką!</h2>
      <p>Przekazywanie uprawnień do trackera aplikacji... To okno zamknie się automatycznie za chwilę.</p>
    </div>
    <script>
      (function() {
        const hash = window.location.hash.substring(1);
        const search = window.location.search.substring(1);
        const params = new URLSearchParams(hash || search);
        const accessToken = params.get('access_token');
        const code = params.get('code');
        const state = params.get('state') || '';
        const error = params.get('error') || params.get('error_description');

        const provider = state.includes('outlook') ? 'outlook' : state.includes('gmail') ? 'gmail' : 'unknown';

        const payload = {
          type: 'OAUTH_AUTH_SUCCESS',
          provider,
          accessToken,
          code,
          state,
          error,
          timestamp: Date.now()
        };

        if (window.opener) {
          window.opener.postMessage(payload, '*');
          setTimeout(function() { window.close(); }, 600);
        } else {
          setTimeout(function() { window.location.href = '/'; }, 1000);
        }
      })();
    </script>
  </body>
</html>
  `);
});

// Endpoint: Sample realistic recruitment emails for immediate testing
app.get('/api/sample-emails', (req: Request, res: Response) => {
  const sampleMessages = [
    {
      id: 'sample-msg-1',
      provider: 'outlook',
      sender: 'rekrutacja@spyro-soft.com',
      senderName: 'Spyrosoft HR & Talent',
      subject: 'Zaproszenie na rozmowę techniczną: QA Engineer - BDD Automation',
      date: '2026-09-22T14:30:00Z',
      snippet: 'Dzień dobry! Z przyjemnością informujemy, że Twoja aplikacja przeszła do kolejnego etapu. Chcielibyśmy zaprosić Cię na rozmowę techniczną...',
      body: `Dzień dobry,

Z przyjemnością informujemy, że Twoja aplikacja na stanowisko QA Engineer - BDD Automation w Spyrosoft przeszła pomyślnie wstępną weryfikację CV! 

Chcielibyśmy zaprosić Cię na kolejny etap procesu: 60-minutową rozmowę techniczną z naszym Tech Leadem oraz Architektem QA.
Proponowany termin spotkania: czwartek, 25 września 2026 o godz. 11:00.

Spotkanie odbędzie się w formie zdalnej przez Microsoft Teams:
https://teams.microsoft.com/l/meetup-join/spyrosoft-qa-tech-interview

Prosimy o potwierdzenie dostępności w tym terminie lub zaproponowanie alternatywnej godziny.

Pozdrawiamy serdecznie,
Zespół Rekrutacji Spyrosoft`,
    },
    {
      id: 'sample-msg-2',
      provider: 'outlook',
      sender: 'talent.acquisition@kuehne-nagel.com',
      senderName: 'Kuehne+Nagel Careers',
      subject: 'Kuehne+Nagel - Kolejny etap: Zadanie rekrutacyjne (QA Automation Engineer)',
      date: '2026-09-21T09:15:00Z',
      snippet: 'Dziękujemy za dotychczasowy udział w rekrutacji. W ramach kolejnego kroku przesyłamy zadanie techniczne z testów automatycznych...',
      body: `Cześć,

Dziękujemy za Twoją aplikację na stanowisko QA Automation Engineer w centrum technologicznym Kuehne+Nagel. 

Twój profil idealnie wpisuje się w nasze wymagania. Chcielibyśmy zweryfikować Twoje praktyczne podejście do automatyzacji testów API oraz frameworka testowego.
Przygotowaliśmy krótkie zadanie rekrutacyjne:
- Repozytorium z zadaniem: https://gitlab.com/kuehne-nagel-tech/qa-automation-task-2026
- Czas na odesłanie rozwiązania: 5 dni roboczych (do 26 września 2026, godz. 23:59).

W razie pytań technicznych możesz odpowiedzieć bezpośrednio na ten e-mail.

Z poważaniem,
Kuehne+Nagel Talent Acquisition Team`,
    },
    {
      id: 'sample-msg-3',
      provider: 'gmail',
      sender: 'hr@sportano.com',
      senderName: 'Sportano.com People Team',
      subject: 'Oficjalna oferta współpracy - Test Automation Engineer w Sportano! 🎉',
      date: '2026-09-23T08:45:00Z',
      snippet: 'Jesteśmy pod ogromnym wrażeniem Twojej wiedzy z rozmowy technicznej i chcielibyśmy złożyć Ci oficjalną ofertę pracy...',
      body: `Dzień dobry,

Mamy wspaniałe wiadomości! Zespół inżynierów oraz Zarząd Sportano.com byli pod wielkim wrażeniem Twojej wiedzy podczas wczorajszej rozmowy technicznej.

Z ogromną radością składamy Ci oficjalną ofertę współpracy na stanowisku Test Automation Engineer:
- Forma współpracy: Kontrakt B2B (lub Umowa o Pracę wg preferencji)
- Wynagrodzenie: 18 500 PLN netto + VAT / m-c
- Tryb pracy: Hybrydowy (Wrocław, 1 dzień w biurze w tygodniu)
- Planowana data rozpoczęcia: 1 listopada 2026

W załączniku przesyłamy szczegółowy list intencyjny z pełnymi warunkami. Będziemy wdzięczni za decyzję do poniedziałku, 28 września.

Nie możemy się doczekać wspólnych projektów!

Pozdrawiamy,
Monika Nowak
Head of People & Culture, Sportano.com`,
    },
    {
      id: 'sample-msg-4',
      provider: 'gmail',
      sender: 'kariera@kadromierz.pl',
      senderName: 'Kadromierz HR',
      subject: 'Informacja zwrotna z procesu rekrutacji - Kadromierz (QA Engineer)',
      date: '2026-09-20T16:00:00Z',
      snippet: 'Dziękujemy za czas poświęcony na aplikację. Po przeanalizowaniu wszystkich zgłoszeń zdecydowaliśmy się kontynuować proces z innym kandydatem...',
      body: `Dzień dobry,

Dziękujemy za przesłanie aplikacji na stanowisko QA Engineer w Kadromierz oraz za czas poświęcony na udział w naszej rekrutacji.

Konkurencja w tym procesie była wyjątkowo wysoka. Po szczegółowej analizie wszystkich nadesłanych zgłoszeń chcielibyśmy poinformować, że zdecydowaliśmy się kontynuować proces z kandydatem, którego profil w tym konkretnym momencie mocniej pokrywał się z wyzwaniami w naszej architekturze mikroserwisów.

Będziemy jednak mieli Twoje CV w bazie na wypadek kolejnych otwarć na stanowiska QA.

Życzymy wielu sukcesów na Twojej ścieżce zawodowej!

Z wyrazami szacunku,
Zespół Kadromierz`,
    },
    {
      id: 'sample-msg-5',
      provider: 'outlook',
      sender: 'recruiting-emea@motorolasolutions.com',
      senderName: 'Motorola Solutions Careers',
      subject: 'Dziękujemy za złożenie aplikacji: Senior Test & Automation Engineer (Kraków)',
      date: '2026-09-23T11:00:00Z',
      snippet: 'Potwierdzamy otrzymanie Twojej aplikacji na stanowisko Senior Test & Automation Engineer w Motorola Solutions...',
      body: `Dear Applicant,

Thank you for your application for the position of Senior Test & Automation Engineer (Ref: MS-POL-8820) at Motorola Solutions in Kraków!

We have successfully received your CV and application details. Our Talent Acquisition team is currently reviewing your experience and skillset against our project requirements. 

You will receive an update regarding the status of your application within the next 5 business days.

Best regards,
Motorola Solutions EMEA Talent Acquisition`,
    },
  ];

  res.json({ emails: sampleMessages });
});

// Endpoint: Fetch real messages from Microsoft Graph API
app.post('/api/outlook/messages', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body.token;

  if (!token) {
    res.status(401).json({ error: 'Brak tokena dostępu do Microsoft Graph' });
    return;
  }

  try {
    const graphRes = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=40&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!graphRes.ok) {
      const errBody = await graphRes.text();
      res.status(graphRes.status).json({ error: 'Błąd pobierania wiadomości z Microsoft Graph', details: errBody });
      return;
    }

    const graphData = await graphRes.json();
    const formatted = (graphData.value || []).map((msg: any) => ({
      id: msg.id,
      provider: 'outlook',
      sender: msg.from?.emailAddress?.address || 'nieznany nadawca',
      senderName: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address,
      subject: msg.subject || 'Brak tematu',
      date: msg.receivedDateTime,
      snippet: msg.bodyPreview || '',
      body: msg.body?.content || msg.bodyPreview || '',
    }));

    res.json({ emails: formatted });
  } catch (error: any) {
    console.error('Outlook fetch error:', error);
    res.status(500).json({ error: error.message || 'Nie udało się pobrać wiadomości z Outlook' });
  }
});

// Endpoint: Fetch real messages from Gmail API
app.post('/api/gmail/messages', async (req: Request, res: Response) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body.token;

  if (!token) {
    res.status(401).json({ error: 'Brak tokena dostępu do Gmail API' });
    return;
  }

  try {
    // List messages matching recruitment keywords
    const query = encodeURIComponent('subject:(rekrutacja OR interview OR aplikacja OR oferta OR "praca" OR "QA" OR "status")');
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${query}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    );

    if (!listRes.ok) {
      const errBody = await listRes.text();
      res.status(listRes.status).json({ error: 'Błąd pobierania listy z Gmail API', details: errBody });
      return;
    }

    const listData = await listRes.json();
    const messageRefs = listData.messages || [];

    // Fetch details for top 15 messages in parallel
    const detailPromises = messageRefs.slice(0, 15).map(async (m: { id: string }) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!itemRes.ok) return null;
        const itemData = await itemRes.json();
        const headers = itemData.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

        const subject = getHeader('Subject');
        const from = getHeader('From');
        const date = getHeader('Date');

        return {
          id: itemData.id,
          provider: 'gmail',
          sender: from,
          senderName: from.split('<')[0].replace(/"/g, '').trim(),
          subject: subject || 'Brak tematu',
          date: date || new Date(parseInt(itemData.internalDate || '0', 10)).toISOString(),
          snippet: itemData.snippet || '',
          body: itemData.snippet || '',
        };
      } catch {
        return null;
      }
    });

    const detailedList = (await Promise.all(detailPromises)).filter(Boolean);
    res.json({ emails: detailedList });
  } catch (error: any) {
    console.error('Gmail fetch error:', error);
    res.status(500).json({ error: error.message || 'Nie udało się pobrać wiadomości z Gmail' });
  }
});

// Endpoint: AI Analysis of Emails against user's applications
app.post('/api/analyze-emails', async (req: Request, res: Response) => {
  const { emails, applications } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    res.status(400).json({ error: 'Przekaż tablicę wiadomości do analizy (emails)' });
    return;
  }

  const appList = Array.isArray(applications) ? applications : [];
  const ai = getGemini();

  // Helper for heuristic extraction when AI is unavailable or fails
  const heuristicAnalysis = (email: any) => {
    const text = `${email.subject} ${email.snippet} ${email.body || ''}`.toLowerCase();
    let suggestedStatus: string = 'Weryfikacja CV';
    let summary = 'Wykryto korespondencję rekrutacyjną';
    let reasoning = 'Wiadomość z procesu rekrutacyjnego';
    let meetingDate: string | undefined;
    let meetingLink: string | undefined;
    let actionRequired: string | undefined;

    if (text.includes('oferta') || text.includes('ofertę') || text.includes('offer')) {
      suggestedStatus = 'Oferta';
      summary = 'Złożono oficjalną ofertę pracy!';
      reasoning = 'E-mail zawiera propozycję zatrudnienia / ofertę współpracy.';
      actionRequired = 'Przeanalizuj warunki i odeślij decyzję';
    } else if (
      text.includes('odrzuc') ||
      text.includes('nie zdecydowaliśmy') ||
      text.includes('z innym kandydatem') ||
      text.includes('innym kandydat') ||
      text.includes('podziękowanie za udział') ||
      text.includes('unfortunately')
    ) {
      suggestedStatus = 'Odrzucona';
      summary = 'Zakończenie procesu rekrutacyjnego (brak dopasowania)';
      reasoning = 'Podziękowanie za udział i decyzja o kontynuacji z innym kandydatem.';
    } else if (
      text.includes('zadanie') ||
      text.includes('techniczne zadanie') ||
      text.includes('task') ||
      text.includes('challenge') ||
      text.includes('codility') ||
      text.includes('hackerrank')
    ) {
      suggestedStatus = 'Zadanie rekrutacyjne';
      summary = 'Przesłano zadanie rekrutacyjne do wykonania';
      reasoning = 'Wiadomość zawiera link do repozytorium lub zadania domowego.';
      actionRequired = 'Wykonaj zadanie techniczne przed wskazanym deadlinem';
    } else if (
      text.includes('rozmow') ||
      text.includes('spotkanie') ||
      text.includes('interview') ||
      text.includes('teams') ||
      text.includes('meet') ||
      text.includes('zaproszenie na')
    ) {
      if (text.includes('techniczn') || text.includes('tech lead') || text.includes('architekt')) {
        suggestedStatus = 'Rozmowa techniczna';
        summary = 'Zaproszenie na rozmowę techniczną';
        reasoning = 'Zaproszenie na wywiad techniczny z zespołem inżynierskim.';
      } else {
        suggestedStatus = 'Rozmowa HR';
        summary = 'Zaproszenie na rozmowę rekrutacyjną / HR';
        reasoning = 'Propozycja spotkania zapoznawczego z rekruterem.';
      }

      if (text.includes('teams.microsoft.com')) meetingLink = 'https://teams.microsoft.com';
      if (text.includes('meet.google.com')) meetingLink = 'https://meet.google.com';
      actionRequired = 'Potwierdź proponowany termin spotkania';
    } else if (text.includes('potwierdzenie') || text.includes('otrzymaliśmy') || text.includes('received your')) {
      suggestedStatus = 'Weryfikacja CV';
      summary = 'Potwierdzenie wpływu aplikacji do systemu pracodawcy';
      reasoning = 'Potwierdzenie rejestracji zgłoszenia przez firmę.';
    }

    // Match with existing application
    let matchedApp = appList.find((app: any) => {
      const compName = app.company.toLowerCase();
      const roleName = app.role.toLowerCase();
      return (
        text.includes(compName) ||
        email.sender.toLowerCase().includes(compName.replace(/\s+/g, '')) ||
        (email.senderName && email.senderName.toLowerCase().includes(compName))
      );
    });

    const isNew = !matchedApp;
    const isChange = matchedApp ? matchedApp.status !== suggestedStatus : false;

    return {
      emailId: email.id,
      provider: email.provider,
      subject: email.subject,
      sender: email.sender,
      senderName: email.senderName,
      date: email.date,
      matchedCompany: matchedApp?.company || (email.senderName || 'Pracodawca'),
      matchedRole: matchedApp?.role || 'Inżynier QA',
      currentStatus: matchedApp?.status,
      suggestedStatus,
      confidence: 'medium' as const,
      summary,
      reasoning,
      meetingDate,
      meetingLink,
      actionRequired,
      matchedApplicationId: matchedApp?.id,
      isStatusChange: isChange,
      isNewApplication: isNew,
      newApplicationData: isNew
        ? {
            company: email.senderName || 'Nowa firma',
            role: email.subject.includes('QA') ? 'QA Specialist' : 'Software Engineer',
            portal: email.provider === 'outlook' ? 'Outlook / Email' : 'Gmail / Email',
            location: 'Polska / Remote',
          }
        : undefined,
      rawExcerpt: email.snippet,
    };
  };

  // If no Gemini API key configured, use heuristic
  if (!ai) {
    const results = emails.map(heuristicAnalysis);
    res.json({
      results,
      analyzedCount: results.length,
      changesCount: results.filter((r) => r.isStatusChange).length,
      source: 'heuristic',
    });
    return;
  }

  try {
    const appsSummary = appList.map((a: any) => ({
      id: a.id,
      company: a.company,
      role: a.role,
      status: a.status,
    }));

    const emailsSummary = emails.slice(0, 15).map((e: any, index: number) => ({
      index,
      id: e.id,
      provider: e.provider,
      sender: e.sender,
      senderName: e.senderName,
      subject: e.subject,
      date: e.date,
      body: (e.body || e.snippet || '').slice(0, 1500),
    }));

    const prompt = `Jesteś ekspertem ds. rekrutacji i analizy korespondencji zawodowej.
Otrzymujesz aktualną listę złożonych przez kandydata aplikacji o pracę oraz listę odebranych wiadomości e-mail (ze skrzynek Outlook i Gmail).

DOZWOLONE STATUSY W TRACKERZE (JobStatus):
- "Wysłana"
- "Weryfikacja CV"
- "Rozmowa HR"
- "Rozmowa techniczna"
- "Zadanie rekrutacyjne"
- "Oferta"
- "Odrzucona"
- "Zrezygnowano"

AKTUALNE APLIKACJE KANDYDATA W SYSTEMIE:
${JSON.stringify(appsSummary, null, 2)}

WIADOMOŚCI E-MAIL DO PRZEANALIZOWANIA:
${JSON.stringify(emailsSummary, null, 2)}

Dla KAŻDEJ wiadomości e-mail (wg indeksu):
1. Zidentyfikuj firmę nadawcy i stanowisko.
2. Dopasuj e-mail do ID istniejącej aplikacji ("matchedApplicationId") z listy kandydata, jeśli e-mail dotyczy tej samej firmy (uwzględnij warianty nazwy, np. "Spyrosoft", "Kuehne+Nagel", "Sportano", "Kadromierz", "co3" itp.). Jeśli nie pasuje do żadnej, ustaw matchedApplicationId na null i oznacz isNewApplication: true.
3. Określ najświeższy i najbardziej adekwatny status rekrutacji ("suggestedStatus") wynikający z treści e-maila:
   - Jeśli to zaproszenie na rozmowę z Tech Leadem / programistami -> "Rozmowa techniczna"
   - Jeśli to rozmowa zapoznawcza / HR -> "Rozmowa HR"
   - Jeśli to zadanie domowe / codility / test -> "Zadanie rekrutacyjne"
   - Jeśli to oficjalna oferta współpracy / list intencyjny -> "Oferta"
   - Jeśli to podziękowanie za udział / odmowa -> "Odrzucona"
   - Jeśli to potwierdzenie wpływu CV -> "Weryfikacja CV"
4. Sprawdź, czy suggestedStatus różni się od currentStatus ("isStatusChange").
5. Wyciągnij kluczowe szczegóły:
   - "summary": zwięzłe podsumowanie w języku polskim (1 zdanie)
   - "reasoning": uzasadnienie statusu (np. "Rekruter zaproponował termin rozmowy technicznej w czwartek")
   - "meetingDate": proponowana data i godzina spotkania (jeśli występuje w treści)
   - "meetingLink": link do spotkania online (np. Teams, Zoom, Google Meet) jeśli występuje
   - "actionRequired": wymagane działanie kandydata (np. "Potwierdź termin rozmowy", "Wyślij rozwiązanie zadania do 26.09")
   - "confidence": "high", "medium" lub "low"`;

    const aiRes = await ai.models.generateContent({
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
              matchedApplicationId: { type: Type.STRING },
              matchedCompany: { type: Type.STRING },
              matchedRole: { type: Type.STRING },
              suggestedStatus: { type: Type.STRING },
              confidence: { type: Type.STRING },
              summary: { type: Type.STRING },
              reasoning: { type: Type.STRING },
              meetingDate: { type: Type.STRING },
              meetingLink: { type: Type.STRING },
              actionRequired: { type: Type.STRING },
              isNewApplication: { type: Type.BOOLEAN },
            },
            required: ['index', 'suggestedStatus', 'summary', 'reasoning'],
          },
        },
      },
    });

    const parsedResults: any[] = JSON.parse(aiRes.text || '[]');
    const resultsMap = new Map<number, any>();
    parsedResults.forEach((item) => {
      if (typeof item.index === 'number') resultsMap.set(item.index, item);
    });

    const finalResults = emails.map((email: any, idx: number) => {
      const aiItem = resultsMap.get(idx);
      if (!aiItem) return heuristicAnalysis(email);

      const matchedApp = appList.find((a: any) => a.id === aiItem.matchedApplicationId);
      const isStatusChange = matchedApp ? matchedApp.status !== aiItem.suggestedStatus : false;

      return {
        emailId: email.id,
        provider: email.provider,
        subject: email.subject,
        sender: email.sender,
        senderName: email.senderName,
        date: email.date,
        matchedCompany: aiItem.matchedCompany || matchedApp?.company || email.senderName,
        matchedRole: aiItem.matchedRole || matchedApp?.role || 'QA Specialist',
        currentStatus: matchedApp?.status,
        suggestedStatus: aiItem.suggestedStatus,
        confidence: aiItem.confidence || 'high',
        summary: aiItem.summary,
        reasoning: aiItem.reasoning,
        meetingDate: aiItem.meetingDate,
        meetingLink: aiItem.meetingLink,
        actionRequired: aiItem.actionRequired,
        matchedApplicationId: aiItem.matchedApplicationId || matchedApp?.id,
        isStatusChange,
        isNewApplication: Boolean(aiItem.isNewApplication && !matchedApp),
        newApplicationData:
          aiItem.isNewApplication && !matchedApp
            ? {
                company: aiItem.matchedCompany || email.senderName || 'Nowa firma',
                role: aiItem.matchedRole || 'Specjalista QA',
                portal: email.provider === 'outlook' ? 'Outlook / Email' : 'Gmail / Email',
                location: 'Polska / Remote',
              }
            : undefined,
        rawExcerpt: (email.body || email.snippet || '').slice(0, 300),
      };
    });

    res.json({
      results: finalResults,
      analyzedCount: finalResults.length,
      changesCount: finalResults.filter((r: any) => r.isStatusChange).length,
      source: 'gemini',
    });
  } catch (error: any) {
    console.error('Email analysis error with Gemini:', error);
    const results = emails.map(heuristicAnalysis);
    res.json({
      results,
      analyzedCount: results.length,
      changesCount: results.filter((r) => r.isStatusChange).length,
      source: 'fallback',
      warning: error.message,
    });
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
