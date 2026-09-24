import { describe, it, expect } from 'vitest';
import { parseRawLinksInput, recalculateBatchDuplicates } from './batchParser';
import { JobApplication } from '../types';

describe('parseRawLinksInput', () => {
  it('should parse markdown links correctly', () => {
    const input = '[Senior QA Engineer | Google | LinkedIn](https://www.linkedin.com/jobs/view/100)';
    const result = parseRawLinksInput(input);

    expect(result.totalDetected).toBe(1);
    expect(result.uniqueCount).toBe(1);
    expect(result.duplicateCount).toBe(0);
    expect(result.items[0].url).toBe('https://www.linkedin.com/jobs/view/100');
    expect(result.items[0].role).toBe('Senior QA Engineer');
    expect(result.items[0].company).toBe('Google');
    expect(result.items[0].portal).toBe('LinkedIn');
    expect(result.items[0].isDuplicate).toBe(false);
  });

  it('should parse HTML anchor tags correctly', () => {
    const input = '<a href="https://nofluffjobs.com/job/qa-lead">QA Lead | Allegro | No Fluff Jobs</a>';
    const result = parseRawLinksInput(input);

    expect(result.totalDetected).toBe(1);
    expect(result.uniqueCount).toBe(1);
    expect(result.items[0].url).toBe('https://nofluffjobs.com/job/qa-lead');
    expect(result.items[0].role).toBe('QA Lead');
    expect(result.items[0].company).toBe('Allegro');
    expect(result.items[0].portal).toBe('NoFluffJobs');
  });

  it('should parse plain raw URLs and extract title from line prefix', () => {
    const input = '1. QA Automation Engineer - Spyrosoft: https://spyro-soft.com/careers/qa';
    const result = parseRawLinksInput(input);

    expect(result.totalDetected).toBe(1);
    expect(result.items[0].url).toBe('https://spyro-soft.com/careers/qa');
    expect(result.items[0].role).toBe('QA Automation Engineer');
    expect(result.items[0].company).toBe('Spyrosoft');
  });

  it('should ignore blank or whitespace-only lines', () => {
    const input = `
      
      [Senior QA | Netguru | LinkedIn](https://linkedin.com/jobs/view/201)
      
      
    `;
    const result = parseRawLinksInput(input);
    expect(result.totalDetected).toBe(1);
  });

  it('should flag duplicate if normalized URL already exists in tracker', () => {
    const existingApps: JobApplication[] = [
      {
        id: 'app-1',
        role: 'QA Engineer',
        company: 'Existing Corp',
        portal: 'LinkedIn',
        url: 'https://linkedin.com/jobs/view/555?utm_source=feed',
        status: 'Wysłana',
        appliedDate: '2026-03-01',
      },
    ];

    const input = '[QA Engineer | Existing Corp | LinkedIn](https://www.linkedin.com/jobs/view/555/)';
    const result = parseRawLinksInput(input, existingApps);

    expect(result.totalDetected).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.items[0].isDuplicate).toBe(true);
    expect(result.items[0].duplicateReason).toContain('Oferta z tym linkiem już istnieje');
  });

  it('should flag duplicate if role and company match existing application', () => {
    const existingApps: JobApplication[] = [
      {
        id: 'app-2',
        role: 'Test Lead',
        company: 'Spotify',
        portal: 'Pracuj.pl',
        url: 'https://pracuj.pl/oferta/111',
        status: 'Wysłana',
        appliedDate: '2026-03-01',
      },
    ];

    // Same company + role, different URL
    const input = '[Test Lead | Spotify | LinkedIn](https://linkedin.com/jobs/view/999)';
    const result = parseRawLinksInput(input, existingApps);

    expect(result.duplicateCount).toBe(1);
    expect(result.items[0].isDuplicate).toBe(true);
    expect(result.items[0].duplicateReason).toContain('Aplikacja dla Spotify (Test Lead) już znajduje się w bazie');
  });

  it('should flag intra-batch duplicate URLs pasted in the same batch', () => {
    const input = `
      [Role 1 | Company A | LinkedIn](https://linkedin.com/jobs/view/1)
      [Role 1 Dupe | Company A | LinkedIn](https://linkedin.com/jobs/view/1)
    `;
    const result = parseRawLinksInput(input);

    expect(result.totalDetected).toBe(2);
    expect(result.uniqueCount).toBe(1);
    expect(result.duplicateCount).toBe(1);
    expect(result.items[0].isDuplicate).toBe(false);
    expect(result.items[1].isDuplicate).toBe(true);
    expect(result.items[1].duplicateReason).toContain('Zduplikowany link na wklejonej liście');
  });
});

describe('recalculateBatchDuplicates', () => {
  it('should properly update duplicate status when applications list changes', () => {
    const parsed = parseRawLinksInput('[Senior QA | Sabre | LinkedIn](https://linkedin.com/jobs/view/300)');
    expect(parsed.items[0].isDuplicate).toBe(false);

    const newExisting: JobApplication[] = [
      {
        id: 'app-3',
        role: 'Senior QA',
        company: 'Sabre',
        portal: 'LinkedIn',
        url: 'https://linkedin.com/jobs/view/300',
        status: 'Wysłana',
        appliedDate: '2026-03-10',
      },
    ];

    const recalculated = recalculateBatchDuplicates(parsed.items, newExisting);
    expect(recalculated.duplicateCount).toBe(1);
    expect(recalculated.items[0].isDuplicate).toBe(true);
  });
});
