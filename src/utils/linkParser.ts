import { JobApplication } from '../types';

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

/**
 * Normalizes a URL by stripping tracking parameters, trailing slashes,
 * and standardizing protocols/hosts to reliably detect duplicates.
 */
export function normalizeJobUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = parsed.pathname;
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }

    // Filter out marketing/tracking parameters
    const trackingParamPrefixes = [
      'utm_',
      'gad_',
      'gclid',
      'gbraid',
      'eclid',
      'fbclid',
      'refid',
      'trackingid',
      'origin',
      'origintolandingjobpostings',
      'ebp',
      'campaignid',
      'adgroupid',
      'keyword',
      'searchid',
      'source',
      's',
    ];

    const cleanParams = new URLSearchParams();
    parsed.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      const isTracking = trackingParamPrefixes.some(
        (prefix) => lowerKey === prefix || lowerKey.startsWith(prefix)
      );
      if (!isTracking) {
        cleanParams.append(key, val);
      }
    });

    const queryString = cleanParams.toString();
    return `${parsed.protocol}//${host}${pathname}${queryString ? `?${queryString}` : ''}`;
  } catch {
    // If URL parsing fails, return a cleaned string
    return trimmed.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  }
}

/**
 * Deduce portal name from URL
 */
export function deducePortalFromUrl(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('nofluffjobs.com')) return 'NoFluffJobs';
    if (host.includes('justjoin.it')) return 'Just Join IT';
    if (host.includes('pracuj.pl')) return 'Pracuj.pl';
    if (host.includes('theprotocol.it')) return 'The Protocol';
    if (host.includes('thesmartjobs.com')) return 'TheSmartJobs';
    if (host.includes('spyro-soft.com')) return 'Spyrosoft Careers';
    if (host.includes('kuehne-nagel.com')) return 'Kuehne+Nagel Careers';
    if (host.includes('ppg.com')) return 'PPG Careers';
    if (host.includes('softserveinc.com')) return 'SoftServe Careers';
    if (host.includes('traffit.com')) return 'Traffit ATS';
    if (host.includes('elevato.net')) return 'Elevato ATS';
    if (host.includes('solidjobs.pl')) return 'Solid.Jobs';
    if (host.includes('bulldogjob.pl')) return 'Bulldogjob';

    const parts = host.replace(/^www\./, '').split('.');
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  } catch {
    return 'Inny portal';
  }
}

/**
 * Deduce company from domain / subdomain when applicable
 */
function deduceCompanyFromDomain(urlStr: string): string | null {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('spyro-soft.com')) return 'Spyrosoft';
    if (host.includes('kuehne-nagel.com')) return 'Kuehne+Nagel';
    if (host.includes('ppg.com')) return 'PPG';
    if (host.includes('softserveinc.com')) return 'SoftServe';
    if (host.includes('soflab.traffit.com')) return 'Soflab';
    if (host.includes('ailleron.elevato.net')) return 'Ailleron';
    if (host.includes('thesmartjobs.com')) return 'TheSmartJobs';

    // Subdomains like xyz.traffit.com or abc.elevato.net
    if (host.endsWith('.traffit.com') || host.endsWith('.elevato.net') || host.endsWith('.recruitee.com')) {
      const sub = host.split('.')[0];
      if (sub && sub !== 'www') {
        return sub.charAt(0).toUpperCase() + sub.slice(1);
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Clean job role titles by removing generic words
 */
function cleanJobRole(raw: string): string {
  let role = raw.trim();
  role = role.replace(/^(Praca|Oferta pracy|Job|Oferta)\s+/i, '');
  role = role.replace(/\s+(Job|Oferta|Oferta pracy)$/i, '');
  role = role.replace(/\s*\(m\/f\/d\)/i, '');
  role = role.replace(/\s*\(m\/f\/nb\)/i, '');
  role = role.replace(/\s*\(k\/m\)/i, '');
  role = role.trim();
  return role || 'QA Engineer';
}

/**
 * Clean company name
 */
function cleanCompany(raw: string): string {
  let company = raw.trim();
  company = company.replace(/^(w|at|dla)\s+/i, '');
  company = company.replace(/,\s*(Warszawa|Wrocław|Kraków|Gdańsk|Poznań|Remote|Polska).*$/i, '');
  return company.trim();
}

/**
 * Extracts role, company, location from link text/title & URL
 */
export function extractMetadataFromTitleAndUrl(
  title: string,
  url: string
): { role: string; company: string; portal: string; location?: string } {
  const portal = deducePortalFromUrl(url);
  const deducedComp = deduceCompanyFromDomain(url);
  const cleanTitle = title.trim();

  // If title is empty or generic, deduce from URL
  if (!cleanTitle || cleanTitle.toLowerCase() === 'link' || cleanTitle.startsWith('http')) {
    const urlParts = url.split('/').filter(Boolean);
    const lastSlug = urlParts[urlParts.length - 1] || '';
    const cleanSlug = decodeURIComponent(lastSlug)
      .replace(/[-_]/g, ' ')
      .replace(/\?.*$/, '')
      .replace(/\.html?$/, '');

    return {
      role: cleanSlug.length > 3 ? cleanJobRole(cleanSlug) : 'QA Engineer',
      company: portal,
      portal,
    };
  }

  // Case 1: LinkedIn format: "Role | Company | LinkedIn" or "Role - Company | LinkedIn"
  if (cleanTitle.includes('|') && (cleanTitle.toLowerCase().includes('linkedin') || portal === 'LinkedIn')) {
    const segments = cleanTitle.split('|').map((s) => s.trim()).filter(Boolean);
    const nonLinkedinSegments = segments.filter((s) => !s.toLowerCase().includes('linkedin'));

    if (nonLinkedinSegments.length >= 2) {
      return {
        role: cleanJobRole(nonLinkedinSegments[0]),
        company: cleanCompany(nonLinkedinSegments[1]),
        portal: 'LinkedIn',
      };
    } else if (nonLinkedinSegments.length === 1) {
      // e.g. "Senior QA Engineer - Spyrosoft | LinkedIn"
      if (nonLinkedinSegments[0].includes(' - ') || nonLinkedinSegments[0].includes(' – ')) {
        const parts = nonLinkedinSegments[0].split(/\s+[-–]\s+/);
        return {
          role: cleanJobRole(parts[0]),
          company: cleanCompany(parts[1] || 'Firma'),
          portal: 'LinkedIn',
        };
      }
      return {
        role: cleanJobRole(nonLinkedinSegments[0]),
        company: 'LinkedIn',
        portal: 'LinkedIn',
      };
    }
  }

  // Case 2: NoFluffJobs format:
  // e.g. "Senior QA Engineer Job | Testing | CO3 | Remote | No Fluff Jobs."
  // or "Praca Senior QA Engineer | Testing | GFT Poland | Wrocław | No Fluff Jobs."
  // or "Praca Manual Tester (Client-Facing) – Food Compliance SaaS | Testing | GFComply Sàrl | Zdalnie | No Fluff Jobs."
  if (cleanTitle.includes('|') && (cleanTitle.toLowerCase().includes('no fluff') || portal === 'NoFluffJobs')) {
    const segments = cleanTitle.split('|').map((s) => s.trim()).filter(Boolean);
    const roleCandidate = segments[0] || 'QA Engineer';
    let companyCandidate = '';
    let locationCandidate = '';

    // Walk through middle segments
    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      if (seg.toLowerCase().includes('no fluff')) continue;
      if (seg.toLowerCase() === 'testing' || seg.toLowerCase() === 'it' || seg.toLowerCase() === 'qa') continue;
      if (/^(zdalnie|remote|warszawa|wrocław|kraków|poznań|gdańsk|katowice|łódź)$/i.test(seg)) {
        locationCandidate = seg;
      } else if (!companyCandidate) {
        companyCandidate = seg;
      }
    }

    return {
      role: cleanJobRole(roleCandidate),
      company: cleanCompany(companyCandidate || 'NoFluffJobs'),
      portal: 'NoFluffJobs',
      location: locationCandidate || undefined,
    };
  }

  // Case 3: The Protocol format:
  // e.g. "Praca QA Engineer, Polski Standard Płatności S.A., Warszawa, Czerniakowska 87a - theprotocol.it"
  // or "Praca QA Automation Engineer / Quality Engineer with AI Experience, ITEAMLY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ, Kraków - theprotocol.it"
  if (cleanTitle.toLowerCase().includes('theprotocol.it') || portal === 'The Protocol') {
    const stripped = cleanTitle.replace(/\s*[-–]\s*theprotocol\.it.*$/i, '').trim();
    const parts = stripped.split(/,\s*/);
    if (parts.length >= 2) {
      const role = cleanJobRole(parts[0]);
      const company = cleanCompany(parts[1]);
      const location = parts[2] ? parts[2].trim() : undefined;
      return {
        role,
        company,
        portal: 'The Protocol',
        location,
      };
    }
  }

  // Case 4: Pracuj.pl format:
  // e.g. "Oferta pracy QA Automation Engineer / Quality Engineer with AI Experience, ITEAMLY SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ, Kraków"
  // e.g. "Oferta pracy Test Automation Expert / Architect, NTT DATA Business Solutions sp. z o.o., Poznań"
  // e.g. "Szczegóły aplikacji | Konto | Pracuj.pl"
  if (cleanTitle.toLowerCase().includes('pracuj.pl') || portal === 'Pracuj.pl') {
    if (cleanTitle.toLowerCase().includes('szczegóły aplikacji') || cleanTitle.toLowerCase().includes('moje aplikacje')) {
      // Extract application ID from URL if present
      const appIdMatch = url.match(/\/moje-aplikacje\/(\d+)/i);
      return {
        role: 'Aplikacja Pracuj.pl',
        company: appIdMatch ? `Pracuj.pl (#${appIdMatch[1]})` : 'Pracuj.pl',
        portal: 'Pracuj.pl',
      };
    }

    const stripped = cleanTitle.replace(/^(Oferta pracy|Praca)\s+/i, '');
    const parts = stripped.split(/,\s*/);
    if (parts.length >= 2) {
      return {
        role: cleanJobRole(parts[0]),
        company: cleanCompany(parts[1]),
        portal: 'Pracuj.pl',
        location: parts[2] ? parts[2].trim() : undefined,
      };
    }
  }

  // Case 5: Standard hyphen separator: "Role - Company" or "Role – Company"
  // e.g. "QA Engineer (BDD & Automation) - Spyrosoft"
  // e.g. "Test Automation Engineer - Sportano.com"
  // e.g. "QA Engineer - Kadromierz"
  // e.g. "Quality Assurance Engineer - Oferta pracy" (where "Oferta pracy" is not a company!)
  if (cleanTitle.includes(' - ') || cleanTitle.includes(' – ')) {
    const parts = cleanTitle.split(/\s+[-–]\s+/);
    if (parts.length >= 2) {
      const candidateComp = parts[1].trim();
      const isGenericPhrase = /^(oferta pracy|oferta|praca|job|kariera|aplikuj|rekrutacja|szczegóły|ogłoszenie)$/i.test(
        candidateComp
      );
      return {
        role: cleanJobRole(parts[0]),
        company: isGenericPhrase ? deducedComp || portal : cleanCompany(parts[1]),
        portal,
      };
    }
  }

  // Case 6: Pipe separator: "Role | Company | Something"
  if (cleanTitle.includes('|')) {
    const parts = cleanTitle.split('|').map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        role: cleanJobRole(parts[0]),
        company: cleanCompany(parts[1]),
        portal,
      };
    }
  }

  // Case 7: "Role at Company" or "Role in Location | Digital & IT at Company"
  // e.g. "Automation Testing Manager (m/f/d) in Wrocław, Lower Silesian, Poland | Digital & IT at PPG"
  const atMatch = cleanTitle.match(/(?:at|w)\s+([A-Za-z0-9\s&]+)$/i);
  if (atMatch) {
    const comp = atMatch[1].trim();
    const rolePart = cleanTitle.split(/\s+(?:in|w)\s+/i)[0] || cleanTitle;
    return {
      role: cleanJobRole(rolePart),
      company: cleanCompany(comp),
      portal,
    };
  }

  // Fallback: Use full cleaned title as role, and portal/URL host as company
  let finalRole = cleanJobRole(cleanTitle);
  if (/job\s+search|szukaj|wyszukiwanie/i.test(finalRole)) {
    const slugMatch = url.match(/\/([A-Za-z0-9-]+)(?:\?|$)/);
    if (slugMatch && slugMatch[1] && slugMatch[1].length > 3 && !/^\d+$/.test(slugMatch[1])) {
      finalRole = cleanJobRole(slugMatch[1].replace(/[-_]/g, ' '));
    }
  }

  return {
    role: finalRole,
    company: deducedComp || portal,
    portal,
  };
}

/**
 * Parses raw text input supporting Markdown links [Title](URL),
 * HTML links <a href="URL">Title</a>, and raw HTTP/HTTPS URLs.
 * Detects duplicates against existing applications and within the batch.
 */
export function parseRawLinksInput(
  rawText: string,
  existingApplications: JobApplication[] = []
): {
  items: ParsedLinkItem[];
  totalDetected: number;
  uniqueCount: number;
  duplicateCount: number;
} {
  const lines = rawText.split('\n');
  const extractedRawItems: { rawText: string; title: string; url: string }[] = [];

  // Markdown link regex: [Title](https://...)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  // HTML link regex: <a href="...">Title</a>
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
  // Raw URL regex
  const rawUrlRegex = /(https?:\/\/[^\s\)"'<>]+)/g;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    let matchedInLine = false;

    // 1. Try Markdown link match
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

    // 2. Try HTML link match
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

    // 3. Try raw URL match
    let urlMatch: RegExpExecArray | null;
    while ((urlMatch = rawUrlRegex.exec(trimmedLine)) !== null) {
      // If line has text before the URL (e.g. "QA Engineer: https://..."), extract title
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

  // Track duplicates seen in the current batch
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
): {
  items: ParsedLinkItem[];
  totalDetected: number;
  uniqueCount: number;
  duplicateCount: number;
} {
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

