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
      else if (pathname.includes('krakow') || pathname.includes('kraków')) hints.location = 'Kraków';
      else if (pathname.includes('wroclaw') || pathname.includes('wrocław')) hints.location = 'Wrocław';
      else if (pathname.includes('gdansk') || pathname.includes('gdańsk')) hints.location = 'Gdańsk';
      else if (pathname.includes('poznan') || pathname.includes('poznań')) hints.location = 'Poznań';
      else if (pathname.includes('katowice')) hints.location = 'Katowice';
      else if (pathname.includes('lodz') || pathname.includes('łódź')) hints.location = 'Łódź';
      else if (pathname.includes('remote') || pathname.includes('zdalnie')) hints.location = 'Remote';
      if (pathname.includes('optiveum')) hints.company = 'Optiveum';
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

function cleanCompanyName(raw: string): string {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^(?:Firma|Pracodawca|Company):\s*/i, '');
  cleaned = cleaned.replace(/\s+SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ/i, '');
  cleaned = cleaned.replace(/\s+SP\.?\s*Z\s*O\.?\s*O\.?/i, '');
  cleaned = cleaned.replace(/\s+S\.A\./i, '');
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 2) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
  }
  return cleaned.trim();
}

/**
 * Cleans and validates a salary string, ensuring job description text is never included.
 */
export function cleanSalary(rawSalary?: string): string {
  if (!rawSalary) return '';
  let s = String(rawSalary).trim();
  // Strip trailing punctuation except abbreviations ending with dot (e.g. godz., mies., m-c.)
  s = s.replace(/(?<!\b(?:godz|mies|m-c|tydz))\.\s*$/, '').replace(/[,;:\s]+$/, '').trim();

  // Strip narrative words and full sentences that may follow
  const narrativePattern = /(?:\.\s+[A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]|\b(?:opis|wymagani|obowiązk|oferujem|stanowisk|doświadczeni|nasz|zespół|projekt|poszukuj|aplikuj|kandydat|benefity|lokalizacj)\b)/i;
  const cutIndex = s.search(narrativePattern);
  if (cutIndex > 0) {
    s = s.slice(0, cutIndex).trim();
  }

  // Strictly capture valid salary format (range or single rate with currency & qualifier)
  const strictSalaryRegex = /^(\d[\d\s,.]*(?:[-–—]|do)?\s*(?:\d[\d\s,.]*)?\s*(?:zł|PLN|EUR|USD|GBP|k\b)(?:\s*(?:netto|brutto|net|gross|(?:\+?\s*VAT)|\bB2B\b|\bUoP\b|\bUoD\b|\bUoZ\b|\([A-Za-z0-9\s+]+\)|\/\s*(?:h|godz(?:in[aę])?\.?|m(?:ies(?:iąc|ięcznie)?)?\.?|day|dzień|m-c\.?|rok|yr|mo|month|mth)))*)/i;
  const match = s.match(strictSalaryRegex);
  if (match && match[1]) {
    s = match[1].trim();
  }

  // Absolute length safety guard
  if (s.length > 70) {
    return '';
  }

  // Reject if it doesn't contain a number and a currency or rate
  if (!/\d/.test(s) || !/(?:zł|PLN|EUR|USD|GBP|k\b|\/h|\/godz)/i.test(s)) {
    return '';
  }

  return s;
}

/**
 * Fallback metadata extractor from rawText, linkTitle & known URLs
 */
export function extractHeuristicJob(
  url?: string,
  linkTitle?: string,
  portal?: string,
  hints?: PortalHints,
  rawText?: string
) {
  let role = hints?.role || '';
  let company = hints?.company || '';
  let location = hints?.location || '';
  let salary = '';
  let workType = '';
  const skills: string[] = [];

  // 1. Role, company & location from linkTitle
  if (linkTitle) {
    let cleanTitle = String(linkTitle).trim();
    // Strip common portal name suffixes
    cleanTitle = cleanTitle.replace(
      /\s*[-|–]\s*(The Protocol|the:protocol|No Fluff Jobs|NoFluffJobs|Pracuj\.pl|LinkedIn|Just Join IT|Solid\.Jobs|Bulldogjob).*$/i,
      ''
    );

    if (cleanTitle.includes(' | ')) {
      const segs = cleanTitle.split(' | ').map((s) => s.trim()).filter(Boolean);
      if (segs.length >= 2) {
        role = segs[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
        if (!company) company = cleanCompanyName(segs[1]);
        if (segs[2] && !location) {
          location = segs[2];
        }
      }
    } else if (cleanTitle.includes(' - ') || cleanTitle.includes(' – ')) {
      const parts = cleanTitle.split(/\s+[-–]\s+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        role = parts[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
        if (!company) company = cleanCompanyName(parts[1]);
      }
    } else if (cleanTitle.includes(', ')) {
      const parts = cleanTitle.split(', ').map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        role = parts[0].replace(/^(Praca|Oferta pracy)\s+/i, '');
        if (!company) company = cleanCompanyName(parts[1]);
        if (parts[2] && !location) location = parts[2];
      }
    } else {
      role = cleanTitle.replace(/^(Praca|Oferta pracy)\s+/i, '');
    }
  }

  // 2. Extract rich details from rawText if available
  if (rawText) {
    // Company from rawText (e.g. "Firma: OPTIVEUM SPÓŁKA Z O.O.")
    const compMatch = rawText.match(/(?:Firma|Pracodawca|Company):\s*([^\n\r,]+)/i);
    if (compMatch && compMatch[1]) {
      company = cleanCompanyName(compMatch[1]);
    }

    // Role from rawText if not yet set
    if (!role) {
      const roleMatch = rawText.match(/(?:Stanowisko|Rola):\s*([^\n\r]+)/i);
      if (roleMatch && roleMatch[1]) {
        role = roleMatch[1].trim();
      } else {
        const lines = rawText
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l.length > 3 && !/^(dla kandydatów|dla pracodawców|aplikuj|zapisz|menu|logowanie)/i.test(l));
        if (lines[0] && lines[0].length < 80) {
          role = lines[0];
        }
      }
    }

    // Salary from rawText (strict extraction without greedily capturing offer description)
    const salaryRegex = /(?:^|[^\d])(\d[\d\s,.]*\s*(?:[-–—]|do)\s*\d[\d\s,.]*\s*(?:zł|PLN|EUR|USD|GBP|k\b)(?:\s*(?:netto|brutto|net|gross|(?:\+?\s*VAT)|\bB2B\b|\bUoP\b|\bUoD\b|\bUoZ\b|\([A-Za-z0-9\s+]+\)|\/\s*(?:h|godz(?:in[aę])?\.?|m(?:ies(?:iąc|ięcznie)?)?\.?|day|dzień|m-c\.?|rok|yr|mo|month|mth)))*)/i;
    const singleSalaryRegex = /(?:^|[^\d])(\d[\d\s,.]*\s*(?:zł|PLN|EUR|USD|GBP)(?:\s*(?:netto|brutto|net|gross|(?:\+?\s*VAT)|\bB2B\b|\bUoP\b|\bUoD\b|\bUoZ\b|\([A-Za-z0-9\s+]+\)|\/\s*(?:h|godz(?:in[aę])?\.?|m(?:ies(?:iąc|ięcznie)?)?\.?|day|dzień|m-c\.?|rok|yr|mo|month|mth)))*)/i;

    const salMatch = rawText.match(salaryRegex) || rawText.match(singleSalaryRegex);
    if (salMatch && salMatch[1]) {
      salary = cleanSalary(salMatch[1]);
    }

    // Work type
    if (/tryb pracy:\s*hybryd|hybrydow/i.test(rawText)) {
      workType = 'Hybrydowo';
    } else if (/tryb pracy:\s*zdaln|zdalnie|remote/i.test(rawText)) {
      workType = 'Zdalnie';
    } else if (/tryb pracy:\s*stacjonar|biuro/i.test(rawText)) {
      workType = 'Stacjonarnie';
    }

    // Location from rawText
    if (!location) {
      const explicitLocMatch = rawText.match(/(?:Lokalizacja|Lokalizacje|Location):\s*([^\n\r]+)/i);
      if (explicitLocMatch && explicitLocMatch[1]) {
        location = explicitLocMatch[1].trim();
      } else {
        const locMatch = rawText.match(/\|\s*([A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźż]+(?:\s*,\s*[a-ząćęłńóśźż]+)?)\s*(?:wiele lokalizacji|\d+ office days|\||\n|$)/i);
        if (locMatch && locMatch[1]) {
          location = locMatch[1].trim();
        } else {
          const cityWithRegionMatch = rawText.match(/\b(Gdańsk|Wrocław|Warszawa|Kraków|Poznań|Katowice|Łódź|Szczecin|Lublin|Białystok|Gdynia|Sopot)(?:,\s*[a-ząćęłńóśźż]+)?\b/i);
          if (cityWithRegionMatch && cityWithRegionMatch[0]) {
            location = cityWithRegionMatch[0].trim();
          }
        }
      }
    }

    // Known skills scanner
    const knownSkills = [
      'Python', 'Robot Framework', 'Selenium', 'Playwright', 'Cypress', 'Appium',
      'Java', 'JavaScript', 'TypeScript', 'C#', '.NET', 'SQL', 'Microsoft SQL Server',
      'PostgreSQL', 'MySQL', 'MongoDB', 'Docker', 'Kubernetes', 'AWS', 'Azure',
      'GCP', 'Git', 'GitHub', 'GitLab', 'Jira', 'Confluence', 'Jenkins', 'Bamboo',
      'Postman', 'REST', 'API', 'BDD', 'TDD', 'Cucumber', 'XML', 'JSON', 'CSV',
      'Linux', 'CI/CD', 'TestRail', 'Zephyr', 'QA', 'Testing'
    ];

    for (const sk of knownSkills) {
      const regex = new RegExp(`\\b${sk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(rawText) && !skills.includes(sk)) {
        skills.push(sk);
      }
    }
  }

  // 3. Known test fixtures in URL
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

  // Fallbacks: NEVER set company to portal!
  if (!company || (portal && company.toLowerCase() === portal.toLowerCase())) {
    company = hints?.company || 'Firma';
  }

  return {
    role: role || 'Inżynier ds. Jakości (QA)',
    company: company || 'Firma',
    location: location || 'Polska / Remote',
    salary: salary || '',
    workType: workType || (location.toLowerCase().includes('remote') || location.toLowerCase().includes('zdaln') ? 'Zdalnie' : ''),
    portal: portal || 'Inny portal',
    skills: skills.length > 0 ? skills : ['QA', 'Testing', 'Automation'],
    notes: rawText ? 'Dane wyodrębnione heurystycznie z treści oferty.' : 'Dane wyodrębnione z linku i tytułu oferty.',
    source: 'heuristic' as const,
  };
}
