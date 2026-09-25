import { JobApplication } from '../types';
import { normalizeJobUrl } from './urlUtils';

export type DuplicateConfidence = 'exact' | 'high' | 'medium' | 'none';

export type DuplicateMatchField =
  | 'url'
  | 'company'
  | 'role'
  | 'portal'
  | 'appliedDate'
  | 'location';

export interface DuplicateCandidate {
  id?: string;
  role?: string;
  company?: string;
  url?: string;
  portal?: string;
  appliedDate?: string;
  location?: string;
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: DuplicateConfidence;
  reason?: string;
  matchedId?: string;
  matchedApplication?: JobApplication | DuplicateCandidate;
  matchedFields: DuplicateMatchField[];
  detailsMessage?: string;
}

/**
 * Normalizes text for insensitive comparison (accent-insensitive, lowercased, single-spaced).
 */
export function normalizeText(str?: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics/accents (np. ą->a, ó->o)
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes company names by stripping legal entity designations and generic noise.
 */
export function normalizeCompany(company?: string): string {
  if (!company) return '';
  let clean = normalizeText(company);

  // Strip common legal entity markers (both Polish and International)
  const legalSuffixes = [
    /\bsp z o o\b/g,
    /\bspolka z o o\b/g,
    /\bsp j\b/g,
    /\bs a\b/g,
    /\bsa\b/g,
    /\bltd\b/g,
    /\bllc\b/g,
    /\binc\b/g,
    /\bcorp\b/g,
    /\bgmbh\b/g,
    /\bpoland\b/g,
    /\bpolska\b/g,
    /\boddzial w polsce\b/g,
  ];

  for (const regex of legalSuffixes) {
    clean = clean.replace(regex, ' ');
  }

  clean = clean.replace(/\s+/g, ' ').trim();

  // If result is empty or generic fallback
  const genericPlaceholders = new Set([
    'firma',
    'portal pracy',
    'nieokreslona firma',
    'nieznana firma',
    'brak firmy',
  ]);

  if (genericPlaceholders.has(clean)) {
    return '';
  }

  return clean;
}

/**
 * Normalizes role title for comparison.
 */
export function normalizeRole(role?: string): string {
  if (!role) return '';
  const clean = normalizeText(role);

  const genericPlaceholders = new Set([
    'stanowisko',
    'oferta',
    'praca',
    'nieokreslone',
  ]);

  if (genericPlaceholders.has(clean)) {
    return '';
  }

  return clean;
}

/**
 * Tokenizes a string into distinct meaningful words for similarity checks.
 */
function getTokens(str: string): Set<string> {
  const words = normalizeText(str).split(' ').filter((w) => w.length > 1);
  return new Set(words);
}

/**
 * Calculates token overlap Jaccard similarity between two strings.
 */
export function calculateTokenSimilarity(a: string, b: string): number {
  const tokensA = getTokens(a);
  const tokensB = getTokens(b);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  tokensA.forEach((token) => {
    if (tokensB.has(token)) intersectionCount++;
  });

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Detects whether a candidate job application is a duplicate of any existing application.
 * Evaluates multiple parameters: URL, Company, Role, Portal, Applied Date, Location.
 */
export function detectDuplicate(
  candidate: DuplicateCandidate,
  existingApplications: (JobApplication | DuplicateCandidate)[],
  options?: {
    excludeId?: string;
    isBatchCheck?: boolean;
    batchItemIndex?: number;
  }
): DuplicateDetectionResult {
  const candUrl = (candidate.url || '').trim();
  const candNormUrl = candUrl ? normalizeJobUrl(candUrl) : '';
  const candCompanyNorm = normalizeCompany(candidate.company);
  const candRoleNorm = normalizeRole(candidate.role);
  const candPortalNorm = normalizeText(candidate.portal);
  const candDateNorm = (candidate.appliedDate || '').trim();
  const candLocationNorm = normalizeText(candidate.location);

  for (let i = 0; i < existingApplications.length; i++) {
    const existing = existingApplications[i];

    // Skip self when editing
    if (options?.excludeId && existing.id && existing.id === options.excludeId) {
      continue;
    }
    if (candidate.id && existing.id && candidate.id === existing.id) {
      continue;
    }

    const exUrl = (existing.url || '').trim();
    const exNormUrl = exUrl ? normalizeJobUrl(exUrl) : '';
    const exCompanyNorm = normalizeCompany(existing.company);
    const exRoleNorm = normalizeRole(existing.role);
    const exPortalNorm = normalizeText(existing.portal);
    const exDateNorm = (existing.appliedDate || '').trim();
    const exLocationNorm = normalizeText(existing.location);

    const isBatchSource = options?.isBatchCheck;

    // --- CHECK 1: URL Match ---
    if (candNormUrl && exNormUrl && candNormUrl === exNormUrl) {
      const matchedFields: DuplicateMatchField[] = ['url'];
      if (candCompanyNorm && exCompanyNorm && candCompanyNorm === exCompanyNorm) {
        matchedFields.push('company');
      }
      if (candRoleNorm && exRoleNorm && candRoleNorm === exRoleNorm) {
        matchedFields.push('role');
      }
      if (candPortalNorm && exPortalNorm && candPortalNorm === exPortalNorm) {
        matchedFields.push('portal');
      }

      const reason = isBatchSource
        ? 'Zduplikowany link na wklejonej liście (identyczny URL)'
        : `Oferta z tym linkiem już istnieje w trackerze (${existing.company || 'Firma'} - ${existing.role || 'Stanowisko'})`;

      return {
        isDuplicate: true,
        confidence: 'exact',
        reason,
        matchedId: existing.id,
        matchedApplication: existing,
        matchedFields,
        detailsMessage: `Identyczny link URL zgodny z ofertą: ${existing.company || 'Firma'} – ${existing.role || 'Stanowisko'}${existing.appliedDate ? ` (data: ${existing.appliedDate})` : ''}`,
      };
    }

    // --- CHECK 2: Company + Role Matches ---
    const companyMatches =
      candCompanyNorm && exCompanyNorm && candCompanyNorm === exCompanyNorm;

    const roleExactMatches =
      candRoleNorm && exRoleNorm && candRoleNorm === exRoleNorm;

    if (companyMatches && roleExactMatches) {
      const matchedFields: DuplicateMatchField[] = ['company', 'role'];

      const dateMatches = Boolean(
        candDateNorm && exDateNorm && candDateNorm === exDateNorm
      );
      if (dateMatches) matchedFields.push('appliedDate');

      const portalMatches = Boolean(
        candPortalNorm &&
          exPortalNorm &&
          candPortalNorm === exPortalNorm &&
          candPortalNorm !== 'inny portal'
      );
      if (portalMatches) matchedFields.push('portal');

      const locationMatches = Boolean(
        candLocationNorm &&
          exLocationNorm &&
          candLocationNorm === exLocationNorm
      );
      if (locationMatches) matchedFields.push('location');

      let reason = '';
      if (isBatchSource) {
        reason = `Zduplikowane stanowisko w tej samej firmie na liście (${candidate.company || existing.company})`;
      } else if (dateMatches && portalMatches) {
        reason = `Ta sama firma, stanowisko, portal i data (${existing.company} - ${existing.role}, ${existing.appliedDate})`;
      } else if (dateMatches) {
        reason = `Zgodność firmy, stanowiska i daty aplikacji (${existing.company} - ${existing.role}, ${existing.appliedDate})`;
      } else if (portalMatches) {
        reason = `Aplikacja dla ${existing.company} (${existing.role}) z portalu ${existing.portal} już znajduje się w bazie`;
      } else {
        reason = `Aplikacja dla ${existing.company} (${existing.role}) już znajduje się w bazie`;
      }

      return {
        isDuplicate: true,
        confidence: 'high',
        reason,
        matchedId: existing.id,
        matchedApplication: existing,
        matchedFields,
        detailsMessage: `Ta sama firma i stanowisko: ${existing.company} – ${existing.role} (Status: ${(existing as JobApplication).status || 'Wysłana'})`,
      };
    }

    // --- CHECK 3: Same Company + Highly Similar Role (Fuzzy / Token Overlap) ---
    if (companyMatches && candRoleNorm && exRoleNorm) {
      const similarity = calculateTokenSimilarity(candRoleNorm, exRoleNorm);
      // High token similarity, e.g. "Senior Frontend Developer" vs "Frontend Developer"
      const isSubRole =
        candRoleNorm.includes(exRoleNorm) || exRoleNorm.includes(candRoleNorm);

      if (similarity >= 0.6 || isSubRole) {
        const matchedFields: DuplicateMatchField[] = ['company', 'role'];

        const dateMatches = Boolean(candDateNorm && exDateNorm && candDateNorm === exDateNorm);
        if (dateMatches) matchedFields.push('appliedDate');

        const portalMatches = Boolean(
          candPortalNorm && exPortalNorm && candPortalNorm === exPortalNorm && candPortalNorm !== 'inny portal'
        );
        if (portalMatches) matchedFields.push('portal');

        // Only treat as duplicate if portal or date also matches, or if similarity is very high (>=0.8 or substring)
        if (portalMatches || dateMatches || similarity >= 0.75 || isSubRole) {
          return {
            isDuplicate: true,
            confidence: similarity >= 0.8 || isSubRole ? 'high' : 'medium',
            reason: isBatchSource
              ? `Podobne stanowisko w firmie ${existing.company} na liście (${existing.role})`
              : `Aplikacja dla ${existing.company} (${existing.role}) już znajduje się w bazie`,
            matchedId: existing.id,
            matchedApplication: existing,
            matchedFields,
            detailsMessage: `Bardzo podobne stanowisko w tej samej firmie: ${existing.company} – "${existing.role}"`,
          };
        }
      }
    }
  }

  return {
    isDuplicate: false,
    confidence: 'none',
    matchedFields: [],
  };
}
