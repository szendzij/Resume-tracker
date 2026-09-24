import { describe, it, expect } from 'vitest';
import { normalizeJobUrl } from './urlUtils';

describe('normalizeJobUrl', () => {
  it('should return empty string for empty input', () => {
    expect(normalizeJobUrl('')).toBe('');
    expect(normalizeJobUrl('   ')).toBe('');
  });

  it('should strip common tracking parameters (utm_*, gclid, fbclid, etc.)', () => {
    const rawUrl =
      'https://www.nofluffjobs.com/job/senior-qa-engineer?utm_source=linkedin&utm_medium=cpc&utm_campaign=winter2026&gad_source=1&fbclid=abcdef12345';
    const normalized = normalizeJobUrl(rawUrl);

    expect(normalized).toBe('https://nofluffjobs.com/job/senior-qa-engineer');
    expect(normalized).not.toContain('utm_source');
    expect(normalized).not.toContain('utm_medium');
    expect(normalized).not.toContain('gad_source');
    expect(normalized).not.toContain('fbclid');
  });

  it('should preserve legitimate application query parameters while stripping tracking params', () => {
    const rawUrl =
      'https://nofluffjobs.com/job/senior-qa-engineer?salary=15000&utm_source=newsletter&tech=typescript';
    const normalized = normalizeJobUrl(rawUrl);

    expect(normalized).toContain('salary=15000');
    expect(normalized).toContain('tech=typescript');
    expect(normalized).not.toContain('utm_source');
  });

  it('should strip www from host and remove trailing slashes', () => {
    const url1 = 'https://www.linkedin.com/jobs/view/123456789/';
    const url2 = 'https://linkedin.com/jobs/view/123456789';

    expect(normalizeJobUrl(url1)).toBe('https://linkedin.com/jobs/view/123456789');
    expect(normalizeJobUrl(url2)).toBe('https://linkedin.com/jobs/view/123456789');
    expect(normalizeJobUrl(url1)).toBe(normalizeJobUrl(url2));
  });

  it('should handle malformed URLs gracefully without throwing', () => {
    const malformed = 'not-a-valid-url/job-offer/123';
    expect(() => normalizeJobUrl(malformed)).not.toThrow();
    expect(normalizeJobUrl(malformed)).toBe('not-a-valid-url/job-offer/123');
  });
});
