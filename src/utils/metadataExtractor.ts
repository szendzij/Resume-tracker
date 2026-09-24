import {
  deducePortalFromUrl,
  deduceCompanyFromDomain,
  cleanJobRole,
  cleanCompany,
} from './portalDetector';

export interface ExtractedMetadata {
  role: string;
  company: string;
  portal: string;
  location?: string;
}

/**
 * Extracts role, company, location from link text/title & URL
 */
export function extractMetadataFromTitleAndUrl(
  title: string,
  url: string
): ExtractedMetadata {
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
      role: cleanSlug.length > 3 ? cleanJobRole(cleanSlug) : 'Stanowisko',
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
  if (cleanTitle.includes('|') && (cleanTitle.toLowerCase().includes('no fluff') || portal === 'NoFluffJobs')) {
    const segments = cleanTitle.split('|').map((s) => s.trim()).filter(Boolean);
    const roleCandidate = segments[0] || 'Stanowisko';
    let companyCandidate = '';
    let locationCandidate = '';

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

  // Case 3: The Protocol format
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

  // Case 4: Pracuj.pl format
  if (cleanTitle.toLowerCase().includes('pracuj.pl') || portal === 'Pracuj.pl') {
    if (cleanTitle.toLowerCase().includes('szczegóły aplikacji') || cleanTitle.toLowerCase().includes('moje aplikacje')) {
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

  // Case 5: Standard hyphen separator: "Role - Company"
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

  // Case 6: Pipe separator: "Role | Company"
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
