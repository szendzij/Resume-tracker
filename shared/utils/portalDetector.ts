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
export function deduceCompanyFromDomain(urlStr: string): string | null {
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
export function cleanJobRole(raw: string): string {
  let role = raw.trim();
  role = role.replace(/^(Praca|Oferta pracy|Job|Oferta)\s+/i, '');
  role = role.replace(/\s+(Job|Oferta|Oferta pracy)$/i, '');
  role = role.replace(/\s*\(m\/f\/d\)/i, '');
  role = role.replace(/\s*\(m\/f\/nb\)/i, '');
  role = role.replace(/\s*\(k\/m\)/i, '');
  role = role.trim();
  return role || 'Stanowisko';
}

/**
 * Clean company name
 */
export function cleanCompany(raw: string): string {
  let company = raw.trim();
  company = company.replace(/^(w|at|dla)\s+/i, '');
  company = company.replace(/,\s*(Warszawa|Wrocław|Kraków|Gdańsk|Poznań|Remote|Polska).*$/i, '');
  return company.trim();
}
