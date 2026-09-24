import { describe, it, expect } from 'vitest';
import {
  deducePortalFromUrl,
  deduceCompanyFromDomain,
  cleanJobRole,
  cleanCompany,
} from './portalDetector';

describe('deducePortalFromUrl', () => {
  it('should identify well-known job boards correctly', () => {
    expect(deducePortalFromUrl('https://www.linkedin.com/jobs/view/123')).toBe('LinkedIn');
    expect(deducePortalFromUrl('https://nofluffjobs.com/pl/job/qa-engineer')).toBe('NoFluffJobs');
    expect(deducePortalFromUrl('https://justjoin.it/offers/qa-tester')).toBe('Just Join IT');
    expect(deducePortalFromUrl('https://www.pracuj.pl/praca/tester,oferta,12345')).toBe('Pracuj.pl');
    expect(deducePortalFromUrl('https://theprotocol.it/filtry/qa;sp')).toBe('The Protocol');
    expect(deducePortalFromUrl('https://solidjobs.pl/oferta/123')).toBe('Solid.Jobs');
    expect(deducePortalFromUrl('https://bulldogjob.pl/companies/jobs/456')).toBe('Bulldogjob');
  });

  it('should identify known employer career portals and ATS systems', () => {
    expect(deducePortalFromUrl('https://spyro-soft.com/careers/qa')).toBe('Spyrosoft Careers');
    expect(deducePortalFromUrl('https://jobs.kuehne-nagel.com/global/en')).toBe('Kuehne+Nagel Careers');
    expect(deducePortalFromUrl('https://ppg.com/careers/job123')).toBe('PPG Careers');
    expect(deducePortalFromUrl('https://career.softserveinc.com/en-us/vacancies')).toBe('SoftServe Careers');
    expect(deducePortalFromUrl('https://soflab.traffit.com/public/an/123')).toBe('Traffit ATS');
    expect(deducePortalFromUrl('https://ailleron.elevato.net/pl/qa-specialist')).toBe('Elevato ATS');
  });

  it('should capitalize domain name for unknown websites', () => {
    expect(deducePortalFromUrl('https://acme-corp.com/careers')).toBe('Acme-corp');
  });

  it('should return fallback for invalid URLs', () => {
    expect(deducePortalFromUrl('invalid-url-string')).toBe('Inny portal');
  });
});

describe('deduceCompanyFromDomain', () => {
  it('should deduce known direct career sites', () => {
    expect(deduceCompanyFromDomain('https://spyro-soft.com/careers')).toBe('Spyrosoft');
    expect(deduceCompanyFromDomain('https://jobs.kuehne-nagel.com/en')).toBe('Kuehne+Nagel');
    expect(deduceCompanyFromDomain('https://corporate.ppg.com/careers')).toBe('PPG');
    expect(deduceCompanyFromDomain('https://career.softserveinc.com')).toBe('SoftServe');
  });

  it('should deduce company from ATS subdomains', () => {
    expect(deduceCompanyFromDomain('https://soflab.traffit.com/public/an/123')).toBe('Soflab');
    expect(deduceCompanyFromDomain('https://ailleron.elevato.net/pl/app')).toBe('Ailleron');
    expect(deduceCompanyFromDomain('https://allegro.recruitee.com/o/qa-lead')).toBe('Allegro');
  });

  it('should return null for generic websites', () => {
    expect(deduceCompanyFromDomain('https://linkedin.com/jobs')).toBeNull();
    expect(deduceCompanyFromDomain('https://google.com')).toBeNull();
  });
});

describe('cleanJobRole', () => {
  it('should strip common Polish and English prefixes', () => {
    expect(cleanJobRole('Praca QA Engineer')).toBe('QA Engineer');
    expect(cleanJobRole('Oferta pracy Senior Tester')).toBe('Senior Tester');
    expect(cleanJobRole('Job Test Automation Lead')).toBe('Test Automation Lead');
  });

  it('should strip gender tags like (m/f/d) and (k/m)', () => {
    expect(cleanJobRole('QA Automation Engineer (m/f/d)')).toBe('QA Automation Engineer');
    expect(cleanJobRole('Tester Oprogramowania (k/m)')).toBe('Tester Oprogramowania');
    expect(cleanJobRole('Quality Specialist (m/f/nb)')).toBe('Quality Specialist');
  });

  it('should fallback to Stanowisko if empty', () => {
    expect(cleanJobRole('')).toBe('Stanowisko');
    expect(cleanJobRole('   ')).toBe('Stanowisko');
  });
});

describe('cleanCompany', () => {
  it('should remove prepositions like "w", "at", "dla"', () => {
    expect(cleanCompany('w Google Cloud')).toBe('Google Cloud');
    expect(cleanCompany('at Microsoft')).toBe('Microsoft');
    expect(cleanCompany('dla Asseco Poland')).toBe('Asseco Poland');
  });

  it('should strip trailing city or remote annotations', () => {
    expect(cleanCompany('Capgemini, Wrocław')).toBe('Capgemini');
    expect(cleanCompany('Comarch, Warszawa')).toBe('Comarch');
    expect(cleanCompany('SoftServe, Remote')).toBe('SoftServe');
  });
});
