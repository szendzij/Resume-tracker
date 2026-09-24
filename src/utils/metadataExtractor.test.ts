import { describe, it, expect } from 'vitest';
import { extractMetadataFromTitleAndUrl } from './metadataExtractor';

describe('extractMetadataFromTitleAndUrl', () => {
  it('should parse LinkedIn titles format: Role | Company | LinkedIn', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'Senior QA Engineer | Google | LinkedIn',
      'https://www.linkedin.com/jobs/view/123456'
    );

    expect(meta.role).toBe('Senior QA Engineer');
    expect(meta.company).toBe('Google');
    expect(meta.portal).toBe('LinkedIn');
  });

  it('should parse LinkedIn titles with hyphen inside role segment', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'QA Lead - Spotify | LinkedIn',
      'https://www.linkedin.com/jobs/view/999'
    );

    expect(meta.role).toBe('QA Lead');
    expect(meta.company).toBe('Spotify');
    expect(meta.portal).toBe('LinkedIn');
  });

  it('should parse NoFluffJobs titles format: Role | Company | Location | No Fluff Jobs', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'Test Automation Engineer | Allegro | zdalnie | No Fluff Jobs',
      'https://nofluffjobs.com/pl/job/test-automation-engineer-allegro'
    );

    expect(meta.role).toBe('Test Automation Engineer');
    expect(meta.company).toBe('Allegro');
    expect(meta.location).toBe('zdalnie');
    expect(meta.portal).toBe('NoFluffJobs');
  });

  it('should parse The Protocol titles with commas: Role, Company, Location', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'QA Specialist, Motorola Solutions, Kraków - theprotocol.it',
      'https://theprotocol.it/szczegoly/praca/qa-specialist'
    );

    expect(meta.role).toBe('QA Specialist');
    expect(meta.company).toBe('Motorola Solutions');
    expect(meta.location).toBe('Kraków');
    expect(meta.portal).toBe('The Protocol');
  });

  it('should parse Pracuj.pl titles with commas', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'Tester Automatyzujący, Comarch S.A., Kraków',
      'https://www.pracuj.pl/praca/tester,oferta,123'
    );

    expect(meta.role).toBe('Tester Automatyzujący');
    expect(meta.company).toBe('Comarch S.A.');
    expect(meta.location).toBe('Kraków');
    expect(meta.portal).toBe('Pracuj.pl');
  });

  it('should parse Pracuj.pl "moje aplikacje" link', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'Szczegóły aplikacji w Pracuj.pl',
      'https://www.pracuj.pl/moje-aplikacje/98765'
    );

    expect(meta.role).toBe('Aplikacja Pracuj.pl');
    expect(meta.company).toBe('Pracuj.pl (#98765)');
    expect(meta.portal).toBe('Pracuj.pl');
  });

  it('should parse standard hyphen format: Role - Company', () => {
    const meta = extractMetadataFromTitleAndUrl(
      'QA Automation Engineer - Spyrosoft',
      'https://spyro-soft.com/careers/qa'
    );

    expect(meta.role).toBe('QA Automation Engineer');
    expect(meta.company).toBe('Spyrosoft');
  });

  it('should parse URL slug fallback when title is empty or generic', () => {
    const meta = extractMetadataFromTitleAndUrl(
      '',
      'https://justjoin.it/offers/senior-qa-engineer-cypress'
    );

    expect(meta.role.toLowerCase()).toContain('senior qa engineer cypress');
    expect(meta.portal).toBe('Just Join IT');
  });
});
