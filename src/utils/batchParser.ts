import { JobApplication } from '../types';
import { normalizeJobUrl } from './urlUtils';
import { extractMetadataFromTitleAndUrl } from './metadataExtractor';

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
 * Detects duplicates against existing applications and within the batch.
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

  // Pre-calculate normalized URLs for existing applications
  const existingNormalizedMap = new Map<string, JobApplication>();
  const existingRoleCompanyMap = new Map<string, JobApplication>();

  for (const app of existingApplications) {
    if (app.url) {
      const norm = normalizeJobUrl(app.url);
      existingNormalizedMap.set(norm, app);
    }
    if (app.role && app.company && app.company !== 'Firma' && app.company !== 'Portal pracy') {
      const key = `${app.company.toLowerCase().trim()}:::${app.role.toLowerCase().trim()}`;
      existingRoleCompanyMap.set(key, app);
    }
  }

  const batchNormalizedSet = new Set<string>();
  const batchRoleCompanySet = new Set<string>();

  const items: ParsedLinkItem[] = [];
  let duplicateCount = 0;

  for (let i = 0; i < extractedRawItems.length; i++) {
    const raw = extractedRawItems[i];
    const normalizedUrl = normalizeJobUrl(raw.url);
    const meta = extractMetadataFromTitleAndUrl(raw.title, raw.url);

    let isDup = false;
    let dupReason = '';

    const roleCompanyKey =
      meta.company && meta.role && meta.company !== 'Firma' && meta.company !== 'Portal pracy'
        ? `${meta.company.toLowerCase().trim()}:::${meta.role.toLowerCase().trim()}`
        : '';

    // Check 1: Duplicate against existing stored applications by normalized URL
    if (existingNormalizedMap.has(normalizedUrl)) {
      const match = existingNormalizedMap.get(normalizedUrl)!;
      isDup = true;
      dupReason = `Oferta z tym linkiem już istnieje w trackerze (${match.company} - ${match.role})`;
    }
    // Check 2: Duplicate against existing stored applications by Role + Company
    else if (roleCompanyKey && existingRoleCompanyMap.has(roleCompanyKey)) {
      const match = existingRoleCompanyMap.get(roleCompanyKey)!;
      isDup = true;
      dupReason = `Aplikacja dla ${match.company} (${match.role}) już znajduje się w bazie`;
    }
    // Check 3: Duplicate within the pasted batch itself by normalized URL
    else if (batchNormalizedSet.has(normalizedUrl)) {
      isDup = true;
      dupReason = 'Zduplikowany link na wklejonej liście (pominięto)';
    }
    // Check 4: Duplicate within the pasted batch itself by Role + Company
    else if (roleCompanyKey && batchRoleCompanySet.has(roleCompanyKey)) {
      isDup = true;
      dupReason = `Zduplikowane stanowisko w tej samej firmie na liście (${meta.company})`;
    }

    if (isDup) {
      duplicateCount++;
    } else {
      batchNormalizedSet.add(normalizedUrl);
      if (roleCompanyKey) {
        batchRoleCompanySet.add(roleCompanyKey);
      }
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
  const existingNormalizedMap = new Map<string, JobApplication>();
  const existingRoleCompanyMap = new Map<string, JobApplication>();

  for (const app of existingApplications) {
    if (app.url) {
      const norm = normalizeJobUrl(app.url);
      if (norm) existingNormalizedMap.set(norm, app);
    }
    if (app.company && app.role) {
      const key = `${app.company.toLowerCase().trim()}:::${app.role.toLowerCase().trim()}`;
      existingRoleCompanyMap.set(key, app);
    }
  }

  const batchNormalizedSet = new Set<string>();
  const batchRoleCompanySet = new Set<string>();
  let duplicateCount = 0;

  const updatedItems = currentItems.map((item) => {
    let isDup = false;
    let dupReason = '';

    const roleCompanyKey =
      item.company && item.role && item.company !== 'Firma' && item.company !== 'Portal pracy'
        ? `${item.company.toLowerCase().trim()}:::${item.role.toLowerCase().trim()}`
        : '';

    if (item.normalizedUrl && existingNormalizedMap.has(item.normalizedUrl)) {
      const match = existingNormalizedMap.get(item.normalizedUrl)!;
      isDup = true;
      dupReason = `Oferta z tym linkiem już istnieje w trackerze (${match.company} - ${match.role})`;
    } else if (roleCompanyKey && existingRoleCompanyMap.has(roleCompanyKey)) {
      const match = existingRoleCompanyMap.get(roleCompanyKey)!;
      isDup = true;
      dupReason = `Aplikacja dla ${match.company} (${match.role}) już znajduje się w bazie`;
    } else if (item.normalizedUrl && batchNormalizedSet.has(item.normalizedUrl)) {
      isDup = true;
      dupReason = 'Zduplikowany link na wklejonej liście (pominięto)';
    } else if (roleCompanyKey && batchRoleCompanySet.has(roleCompanyKey)) {
      isDup = true;
      dupReason = `Zduplikowane stanowisko w tej samej firmie na liście (${item.company})`;
    }

    if (isDup) {
      duplicateCount++;
    } else {
      if (item.normalizedUrl) batchNormalizedSet.add(item.normalizedUrl);
      if (roleCompanyKey) batchRoleCompanySet.add(roleCompanyKey);
    }

    return {
      ...item,
      isDuplicate: isDup,
      duplicateReason: dupReason,
    };
  });

  return {
    items: updatedItems,
    totalDetected: updatedItems.length,
    uniqueCount: updatedItems.length - duplicateCount,
    duplicateCount,
  };
}
