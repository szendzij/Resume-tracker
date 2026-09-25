import { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES } from '../utils/statusConfig';
import { deducePortalFromUrl } from '../utils/portalDetector';
import { detectDuplicate, DuplicateCandidate, DuplicateMatchField } from '../utils/duplicateDetector';

export type Delimiter = 'auto' | ';' | ',' | '\t' | '|';

export type TargetField =
  | 'role'
  | 'company'
  | 'portal'
  | 'appliedDate'
  | 'status'
  | 'location'
  | 'salary'
  | 'skills'
  | 'url'
  | 'notes'
  | 'ignore';

export interface ColumnMapping {
  csvHeader: string;
  targetField: TargetField;
}

export interface ParsedCsvRow {
  id: string;
  role: string;
  company: string;
  portal: string;
  appliedDate: string;
  status: JobStatus;
  location?: string;
  salary?: string;
  skills: string[];
  url?: string;
  notes?: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  duplicateFields?: DuplicateMatchField[];
  matchedExistingId?: string;
  isValid: boolean;
  validationError?: string;
  rawRow: Record<string, string>;
}

export interface CsvParseResult {
  headers: string[];
  delimiterUsed: string;
  totalRows: number;
  items: ParsedCsvRow[];
  columnMappings: ColumnMapping[];
}

/**
 * Remove UTF-8 BOM if present
 */
export function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) {
    return text.slice(1);
  }
  return text;
}

/**
 * Detect delimiter from sample text
 */
export function detectDelimiter(text: string): ';' | ',' | '\t' | '|' {
  const clean = stripBOM(text);
  const firstLines = clean.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 5);

  if (firstLines.length === 0) return ';';

  const candidates: Array<';' | ',' | '\t' | '|'> = [';', ',', '\t', '|'];
  const scores: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };

  for (const char of candidates) {
    let consistentCount = -1;
    let isConsistent = true;

    for (const line of firstLines) {
      // Rough count outside quotes
      let inQuotes = false;
      let count = 0;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        else if (line[i] === char && !inQuotes) count++;
      }

      if (consistentCount === -1) {
        consistentCount = count;
      } else if (consistentCount !== count || count === 0) {
        isConsistent = false;
      }
      scores[char] += count;
    }

    if (isConsistent && consistentCount > 0) {
      scores[char] += 50; // Bonus for consistent row column count
    }
  }

  // Polish default preference: semicolon ';' if scored equally or highest
  let best = candidates[0];
  let maxScore = -1;

  for (const c of candidates) {
    if (scores[c] > maxScore) {
      maxScore = scores[c];
      best = c;
    }
  }

  return best;
}

/**
 * RFC-4180 compliant CSV tokenizer/parser
 * Handles quotes, multi-line cells, escaped double quotes
 */
export function parseCsvToMatrix(text: string, delimiterChar?: string): string[][] {
  const clean = stripBOM(text);
  const delimiter = delimiterChar && delimiterChar !== 'auto' ? delimiterChar : detectDelimiter(clean);

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < clean.length) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped double quote
          currentField += '"';
          i += 2;
          continue;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }

      if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        currentField = '';
        // Only push non-empty rows
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentField.trim());
        currentField = '';
        if (currentRow.some((val) => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }

      currentField += char;
      i++;
    }
  }

  // Final field & row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((val) => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Remove diacritics and normalize string for header and status matching
 */
function normalizeHeaderName(str: string): string {
  return str
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/[źż]/g, 'z')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Automatically determine target field from column header
 */
export function guessFieldFromHeader(header: string): TargetField {
  const norm = normalizeHeaderName(header);

  if (
    norm.includes('stanowisko') ||
    norm.includes('rola') ||
    norm.includes('role') ||
    norm.includes('position') ||
    norm.includes('tytul') ||
    norm.includes('title') ||
    norm.includes('job')
  ) {
    return 'role';
  }

  if (
    norm.includes('firma') ||
    norm.includes('company') ||
    norm.includes('pracodawca') ||
    norm.includes('employer') ||
    norm.includes('organizacja')
  ) {
    return 'company';
  }

  if (
    norm.includes('portal') ||
    norm.includes('zrodlo') ||
    norm.includes('source') ||
    norm.includes('serwis') ||
    norm.includes('platform')
  ) {
    return 'portal';
  }

  if (
    norm.includes('data') ||
    norm.includes('date') ||
    norm.includes('wyslan') ||
    norm.includes('aplikac') ||
    norm.includes('applied')
  ) {
    return 'appliedDate';
  }

  if (
    norm.includes('status') ||
    norm.includes('stan') ||
    norm.includes('etap') ||
    norm.includes('stage')
  ) {
    return 'status';
  }

  if (
    norm.includes('lokalizacja') ||
    norm.includes('location') ||
    norm.includes('miasto') ||
    norm.includes('city') ||
    norm.includes('miejsce')
  ) {
    return 'location';
  }

  if (
    norm.includes('widelki') ||
    norm.includes('salary') ||
    norm.includes('wynagrodzenie') ||
    norm.includes('stawka') ||
    norm.includes('placa') ||
    norm.includes('pensja') ||
    norm.includes('pay')
  ) {
    return 'salary';
  }

  if (
    norm.includes('technologi') ||
    norm.includes('skill') ||
    norm.includes('umiejetnos') ||
    norm.includes('wymagani') ||
    norm.includes('stack') ||
    norm.includes('tools')
  ) {
    return 'skills';
  }

  if (
    norm.includes('link') ||
    norm.includes('url') ||
    norm.includes('oferta') ||
    norm.includes('ogloszenie') ||
    norm.includes('website')
  ) {
    return 'url';
  }

  if (
    norm.includes('notatk') ||
    norm.includes('note') ||
    norm.includes('uwag') ||
    norm.includes('komentar') ||
    norm.includes('opis') ||
    norm.includes('description')
  ) {
    return 'notes';
  }

  return 'ignore';
}

/**
 * Normalizes input date to YYYY-MM-DD format
 */
export function normalizeDate(raw: string, fallbackDate?: string): string {
  const defaultDate = fallbackDate || new Date().toISOString().split('T')[0];
  if (!raw || !raw.trim()) return defaultDate;

  const clean = raw.trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Format: DD.MM.YYYY or DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format: YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = clean.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Parse using Date constructor as fallback
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    try {
      return parsed.toISOString().split('T')[0];
    } catch {
      return defaultDate;
    }
  }

  return defaultDate;
}

/**
 * Maps raw status string to canonical JobStatus
 */
export function normalizeStatus(raw: string, fallbackStatus: JobStatus = 'Wysłana'): JobStatus {
  if (!raw || !raw.trim()) return fallbackStatus;

  const clean = raw.trim();

  // Exact match check
  const exact = ALL_STATUSES.find((s) => s.toLowerCase() === clean.toLowerCase());
  if (exact) return exact;

  const norm = normalizeHeaderName(clean);

  if (norm.includes('odrzuc') || norm.includes('reject') || norm.includes('odmow')) {
    return 'Odrzucona';
  }
  if (norm.includes('ofert') || norm.includes('offer')) {
    return 'Oferta';
  }
  if (norm.includes('zadani') || norm.includes('task') || norm.includes('test')) {
    return 'Zadanie rekrutacyjne';
  }
  if (norm.includes('techniczn') || norm.includes('tech') || norm.includes('lead')) {
    return 'Rozmowa techniczna';
  }
  if (
    norm.includes('weryfikac') ||
    norm.includes('screening') ||
    norm.includes('przeglad') ||
    norm.includes('review') ||
    norm.includes('otwart')
  ) {
    return 'Weryfikacja CV';
  }
  if (norm.includes('hr') || norm.includes('wstepn') || norm.includes('pierwsza')) {
    return 'Rozmowa HR';
  }
  if (norm.includes('rezygn') || norm.includes('withdrawn') || norm.includes('anulow')) {
    return 'Zrezygnowano';
  }
  if (norm.includes('wyslan') || norm.includes('sent') || norm.includes('applied') || norm.includes('nowa')) {
    return 'Wysłana';
  }

  return fallbackStatus;
}

/**
 * Normalizes skills text into an array
 */
export function normalizeSkills(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  return raw
    .split(/[,;\n/•|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 50);
}

/**
 * Checks if a parsed item matches any existing application (Duplicate)
 * using multi-parameter evaluation (URL, Company, Role, Portal, Date, Location).
 */
export function checkDuplicate(
  role: string,
  company: string,
  url: string | undefined,
  existingApplications: JobApplication[],
  extra?: {
    portal?: string;
    appliedDate?: string;
    location?: string;
  }
): {
  isDuplicate: boolean;
  reason?: string;
  matchedId?: string;
  matchedFields?: DuplicateMatchField[];
} {
  const candidate: DuplicateCandidate = {
    role,
    company,
    url,
    portal: extra?.portal,
    appliedDate: extra?.appliedDate,
    location: extra?.location,
  };

  const result = detectDuplicate(candidate, existingApplications);
  return {
    isDuplicate: result.isDuplicate,
    reason: result.reason,
    matchedId: result.matchedId,
    matchedFields: result.matchedFields,
  };
}

/**
 * Parse raw CSV text and produce structured result with column mappings and items
 */
export function parseCsvApplications(
  csvText: string,
  existingApplications: JobApplication[] = [],
  options?: {
    delimiter?: Delimiter;
    customMappings?: ColumnMapping[];
    defaultStatus?: JobStatus;
    defaultDate?: string;
  }
): CsvParseResult {
  const chosenDelimiter =
    options?.delimiter && options.delimiter !== 'auto'
      ? options.delimiter
      : detectDelimiter(csvText);

  const matrix = parseCsvToMatrix(csvText, chosenDelimiter);

  if (matrix.length === 0) {
    return {
      headers: [],
      delimiterUsed: chosenDelimiter,
      totalRows: 0,
      items: [],
      columnMappings: [],
    };
  }

  const rawHeaders = matrix[0];
  const dataRows = matrix.slice(1);

  // Determine column mappings
  const columnMappings: ColumnMapping[] = options?.customMappings || rawHeaders.map((header) => ({
    csvHeader: header,
    targetField: guessFieldFromHeader(header),
  }));

  const defaultStatus = options?.defaultStatus || 'Wysłana';
  const defaultDate = options?.defaultDate || new Date().toISOString().split('T')[0];

  const processedCsvCandidates: DuplicateCandidate[] = [];

  const items: ParsedCsvRow[] = dataRows.map((row, rowIndex) => {
    const rawRow: Record<string, string> = {};
    let role = '';
    let company = '';
    let portal = '';
    let appliedDate = '';
    let statusRaw = '';
    let location = '';
    let salary = '';
    let skillsRaw = '';
    let url = '';
    let notes = '';

    rawHeaders.forEach((header, colIndex) => {
      const value = row[colIndex] || '';
      rawRow[header] = value;

      const mapping = columnMappings.find((m) => m.csvHeader === header);
      const target = mapping ? mapping.targetField : guessFieldFromHeader(header);

      switch (target) {
        case 'role':
          role = value;
          break;
        case 'company':
          company = value;
          break;
        case 'portal':
          portal = value;
          break;
        case 'appliedDate':
          appliedDate = value;
          break;
        case 'status':
          statusRaw = value;
          break;
        case 'location':
          location = value;
          break;
        case 'salary':
          salary = value;
          break;
        case 'skills':
          skillsRaw = value;
          break;
        case 'url':
          url = value;
          break;
        case 'notes':
          notes = value;
          break;
      }
    });

    // Fallbacks and cleanups
    const finalRole = role.trim() || 'Stanowisko';
    const finalCompany = company.trim() || 'Nieokreślona firma';
    const finalUrl = url.trim();
    const finalPortal = portal.trim() || (finalUrl ? deducePortalFromUrl(finalUrl) : 'Inny portal');
    const finalStatus = normalizeStatus(statusRaw, defaultStatus);
    const finalDate = normalizeDate(appliedDate, defaultDate);
    const skills = normalizeSkills(skillsRaw);

    const candidate: DuplicateCandidate = {
      id: `csv-row-${rowIndex}`,
      role: finalRole,
      company: finalCompany,
      portal: finalPortal,
      appliedDate: finalDate,
      location: location.trim() || undefined,
      url: finalUrl || undefined,
    };

    // 1. Check duplicate against existing stored applications
    const dup = checkDuplicate(finalRole, finalCompany, finalUrl, existingApplications, {
      portal: finalPortal,
      appliedDate: finalDate,
      location: location.trim() || undefined,
    });

    let isDuplicate = dup.isDuplicate;
    let duplicateReason = dup.reason;
    let duplicateFields = dup.matchedFields;
    let matchedExistingId = dup.matchedId;

    // 2. If not duplicate of existing, check against intra-CSV rows
    if (!isDuplicate) {
      const intraCsvCheck = detectDuplicate(candidate, processedCsvCandidates, { isBatchCheck: true });
      if (intraCsvCheck.isDuplicate) {
        isDuplicate = true;
        duplicateReason = intraCsvCheck.reason || 'Zduplikowana pozycja w pliku CSV';
        duplicateFields = intraCsvCheck.matchedFields;
      }
    }

    if (!isDuplicate) {
      processedCsvCandidates.push(candidate);
    }

    const isValid = Boolean(role.trim() || company.trim() || finalUrl);
    const validationError = isValid ? undefined : 'Brak danych stanowiska, firmy lub linku w wierszu';

    return {
      id: `csv-row-${rowIndex}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: finalRole,
      company: finalCompany,
      portal: finalPortal,
      appliedDate: finalDate,
      status: finalStatus,
      location: location.trim() || undefined,
      salary: salary.trim() || undefined,
      skills: skills,
      url: finalUrl || undefined,
      notes: notes.trim() || undefined,
      isDuplicate,
      duplicateReason,
      duplicateFields,
      matchedExistingId,
      isValid,
      validationError,
      rawRow,
    };
  });

  return {
    headers: rawHeaders,
    delimiterUsed: chosenDelimiter,
    totalRows: items.length,
    items,
    columnMappings,
  };
}

/**
 * Generates and triggers download of a sample CSV template with Polish headers
 */
export function downloadSampleCsvTemplate(): void {
  const headers = [
    'Stanowisko',
    'Firma',
    'Portal',
    'Data wyslania CV',
    'Status',
    'Lokalizacja',
    'Widelki',
    'Technologie',
    'Link',
    'Notatki',
  ];

  const sampleRows = [
    [
      '"Senior Software Engineer"',
      '"Allegro"',
      '"Pracuj.pl"',
      `"${new Date().toISOString().split('T')[0]}"`,
      '"Rozmowa HR"',
      '"Warszawa / Hybrydowo"',
      '"20 000 - 26 000 PLN"',
      '"TypeScript, React, Node.js, Docker"',
      '"https://allegro.pl/praca/software-engineer"',
      '"Rozmowa techniczna planowana na kolejny tydzień"',
    ],
    [
      '"Product Specialist"',
      '"Spyrosoft"',
      '"NoFluffJobs"',
      `"${new Date().toISOString().split('T')[0]}"`,
      '"Wysłana"',
      '"Wrocław / Remote"',
      '"10 000 - 14 000 PLN"',
      '"Jira, SQL, Analityka, Agile"',
      '"https://spyro-soft.com/career/product-specialist"',
      '"Wysłano CV przez formularz aplikacyjny"',
    ],
    [
      '"Team Lead / Manager"',
      '"GFT Poland"',
      '"LinkedIn"',
      `"${new Date().toISOString().split('T')[0]}"`,
      '"Weryfikacja CV"',
      '"Kraków"',
      '"24 000 - 30 000 PLN"',
      '"Zarządzanie, Scrum, Strategia, Komunikacja"',
      '"https://www.linkedin.com/jobs/view/123456"',
      '"Kontakt od rekruterki z polecenia"',
    ],
  ];

  const csvContent = '\uFEFF' + [headers.join(';'), ...sampleRows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', downloadUrl);
  link.setAttribute('download', 'szablon-importu-ofert.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(downloadUrl);
}
