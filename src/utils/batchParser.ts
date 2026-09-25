import { JobApplication } from '../types';
import { normalizeJobUrl } from './urlUtils';
import { extractMetadataFromTitleAndUrl } from './metadataExtractor';
import { detectDuplicate, DuplicateCandidate } from './duplicateDetector';

export interface ParsedLinkItem {
  id: string;
  originalText: string;
  title: string;
  url: string;
  normalizedUrl: string;
  role: string;
  company: string;
  portal: string;
  location?: string;
  skills?: string[];
  notes?: string;
  isAiEnriched?: boolean;
  source?: 'heuristic' | 'gemini' | 'fallback';
  isDuplicate: boolean;
  duplicateReason?: string;
  duplicateFields?: string[];
}

export interface ParseBatchResult {
  items: ParsedLinkItem[];
  totalDetected: number;
  uniqueCount: number;
  duplicateCount: number;
}

/**
 * Parses raw text input supporting Markdown links [Title](URL),
 * HTML links <a href="URL">Title</a>, and raw HTTP/HTTPS URLs.
 * Detects duplicates against existing applications and within the batch
 * using multi-parameter evaluation (URL, Company, Role, Portal, Date, Location).
 */
export function parseRawLinksInput(
  rawText: string,
  existingApplications: JobApplication[] = []
): ParseBatchResult {
  const lines = rawText.split('\n');
  const extractedRawItems: { rawText: string; title: string; url: string }[] = [];

  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const rawUrlRegex = /(https?:\/\/[^\s\)"'<>]+)/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    let matchedInLine = false;

    // 1. Markdown link match
    let mdMatch: RegExpExecArray | null;
    while ((mdMatch = mdLinkRegex.exec(trimmedLine)) !== null) {
      extractedRawItems.push({
        rawText: trimmedLine,
        title: mdMatch[1].trim(),
        url: mdMatch[2].trim(),
      });
      matchedInLine = true;
    }
    if (matchedInLine) continue;

    // 2. HTML link match
    let htmlMatch: RegExpExecArray | null;
    while ((htmlMatch = htmlLinkRegex.exec(trimmedLine)) !== null) {
      extractedRawItems.push({
        rawText: trimmedLine,
        title: htmlMatch[2].replace(/<[^>]+>/g, '').trim(),
        url: htmlMatch[1].trim(),
      });
      matchedInLine = true;
    }
    if (matchedInLine) continue;

    // 3. Raw URL match
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = rawUrlRegex.exec(trimmedLine)) !== null) {
      const rawUrl = urlMatch[1].trim();
      const beforeUrl = trimmedLine.replace(rawUrl, '').replace(/^[-*•\d.]+\s*/, '').replace(/[:–-]\s*$/, '').trim();
      extractedRawItems.push({
        rawText: trimmedLine,
        title: beforeUrl || '',
        url: rawUrl,
      });
      matchedInLine = true;
    }
  }

  const processedBatchItems: DuplicateCandidate[] = [];
  const items: ParsedLinkItem[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < extractedRawItems.length; i++) {
    const raw = extractedRawItems[i];
    const normalizedUrl = normalizeJobUrl(raw.url);
    const meta = extractMetadataFromTitleAndUrl(raw.title, raw.url);

    const candidate: DuplicateCandidate = {
      id: `batch-item-${i}`,
      role: meta.role,
      company: meta.company,
      portal: meta.portal,
      location: meta.location,
      url: raw.url,
    };

    // Check against existing stored applications first
    const existingCheck = detectDuplicate(candidate, existingApplications);
    let isDup = existingCheck.isDuplicate;
    let dupReason = existingCheck.reason || '';
    let dupFields = existingCheck.matchedFields;

    // If not duplicate in existing, check against intra-batch items
    if (!isDup) {
      const batchCheck = detectDuplicate(candidate, processedBatchItems, { isBatchCheck: true });
      if (batchCheck.isDuplicate) {
        isDup = true;
        dupReason = batchCheck.reason || 'Zduplikowana pozycja na liście importu';
        dupFields = batchCheck.matchedFields;
      }
    }

    if (isDup) {
      duplicateCount++;
    } else {
      processedBatchItems.push(candidate);
    }

    items.push({
      id: `batch-item-${i}-${Date.now()}`,
      originalText: raw.rawText,
      title: raw.title || meta.role,
      url: raw.url,
      normalizedUrl,
      role: meta.role,
      company: meta.company,
      portal: meta.portal,
      location: meta.location,
      isDuplicate: isDup,
      duplicateReason: dupReason,
      duplicateFields: dupFields,
    });
  }

  return {
    items,
    totalDetected: items.length,
    uniqueCount: items.length - duplicateCount,
    duplicateCount,
  };
}

export const parseBatchInput = parseRawLinksInput;

/**
 * Re-evaluates duplicate status for an existing list of items (e.g. after AI enrichment).
 */
export function recalculateBatchDuplicates(
  currentItems: ParsedLinkItem[],
  existingApplications: JobApplication[] = []
): ParseBatchResult {
  const processedBatchItems: DuplicateCandidate[] = [];
  let duplicateCount = 0;

  const updatedItems = currentItems.map((item, idx) => {
    const candidate: DuplicateCandidate = {
      id: item.id || `recalc-item-${idx}`,
      role: item.role,
      company: item.company,
      portal: item.portal,
      location: item.location,
      url: item.url,
    };

    // Check against existing tracker applications
    const existingCheck = detectDuplicate(candidate, existingApplications);
    let isDup = existingCheck.isDuplicate;
    let dupReason = existingCheck.reason || '';
    let dupFields = existingCheck.matchedFields;

    // Check intra-batch items
    if (!isDup) {
      const batchCheck = detectDuplicate(candidate, processedBatchItems, { isBatchCheck: true });
      if (batchCheck.isDuplicate) {
        isDup = true;
        dupReason = batchCheck.reason || 'Zduplikowana pozycja na liście importu';
        dupFields = batchCheck.matchedFields;
      }
    }

    if (isDup) {
      duplicateCount++;
    } else {
      processedBatchItems.push(candidate);
    }

    return {
      ...item,
      isDuplicate: isDup,
      duplicateReason: dupReason,
      duplicateFields: dupFields,
    };
  });

  return {
    items: updatedItems,
    totalDetected: updatedItems.length,
    uniqueCount: updatedItems.length - duplicateCount,
    duplicateCount,
  };
}
