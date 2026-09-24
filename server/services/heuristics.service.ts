export interface PortalHints {
  role?: string;
  company?: string;
  location?: string;
}

export interface PortalDeductionResult {
  portal: string;
  hints: PortalHints;
}

/**
 * Deduce portal name and basic hints from URL
 */
export function deducePortalAndHints(urlStr: string): PortalDeductionResult {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    let portal = 'Inny portal';
    const hints: PortalHints = {};

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

/**
 * Fallback metadata extractor from linkTitle & known URLs
 */
export function extractHeuristicJob(
  url?: string,
  linkTitle?: string,
  portal?: string,
  hints?: PortalHints
) {
  let role = hints?.role || 'Inżynier ds. Jakości (QA)';
  let company = hints?.company || portal || 'Firma';
  let location = hints?.location || 'Polska / Remote';

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

  return {
    role,
    company,
    location,
    portal: portal || 'Inny portal',
    skills: ['QA', 'Testing', 'Automation'],
    notes: 'Dane wyodrębnione z linku i tytułu oferty.',
    source: 'heuristic' as const,
  };
}
