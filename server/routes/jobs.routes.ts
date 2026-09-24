import { Router, Request, Response } from 'express';
import { deducePortalAndHints, extractHeuristicJob } from '../services/heuristics.service';
import { fetchPageExcerpt } from '../services/scraper.service';
import { getGemini, parseSingleJobWithGemini, parseBatchChunkWithGemini } from '../services/gemini.service';
import { extractMetadataFromTitleAndUrl } from '../../src/utils/linkParser';

export const jobsRouter = Router();

// Endpoint: Parse single job link via Gemini LLM + Heuristics
jobsRouter.post('/parse-job', async (req: Request, res: Response) => {
  const { url, rawText, linkTitle, customApiKey } = req.body;
  const customKey = (req.headers['x-gemini-key'] as string) || customApiKey;

  if (!url && !rawText && !linkTitle) {
    res.status(400).json({ error: 'URL, tytuł lub treść oferty jest wymagana' });
    return;
  }

  const { portal, hints } = deducePortalAndHints(url || '');
  const pageExcerpt = url ? await fetchPageExcerpt(url) : '';
  const ai = getGemini(customKey);

  if (!ai) {
    const heuristicJob = extractHeuristicJob(url, linkTitle, portal, hints);
    res.json(heuristicJob);
    return;
  }

  try {
    const parsedJson = await parseSingleJobWithGemini(ai, {
      url,
      portal,
      linkTitle,
      hints,
      rawText,
      pageExcerpt,
    });

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
jobsRouter.post('/batch-parse', async (req: Request, res: Response) => {
  const { items, urls, customApiKey } = req.body;
  const customKey = (req.headers['x-gemini-key'] as string) || customApiKey;

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

  const itemsToProcess = rawList.slice(0, 60);
  const ai = getGemini(customKey);

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
        source: 'heuristic' as const,
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
      const parsedArray = await parseBatchChunkWithGemini(ai, chunk, chunkIdx);

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
            source: 'gemini' as const,
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
            source: 'fallback' as const,
          });
        }
      }
    }

    res.json({ results: finalResults, isAiUsed: true });
  } catch (error: any) {
    console.error('Batch Gemini error:', error);
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
        source: 'fallback' as const,
      };
    });
    res.json({ results: fallbackResults, isAiUsed: false, warning: error.message });
  }
});
