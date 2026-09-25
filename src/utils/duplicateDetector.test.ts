import { describe, it, expect } from 'vitest';
import {
  detectDuplicate,
  normalizeCompany,
  normalizeRole,
  normalizeText,
  calculateTokenSimilarity,
} from './duplicateDetector';
import { JobApplication } from '../types';

describe('duplicateDetector', () => {
  describe('normalizeCompany', () => {
    it('strips legal entity forms in Polish and English', () => {
      expect(normalizeCompany('Allegro Sp. z o.o.')).toBe('allegro');
      expect(normalizeCompany('Spyrosoft S.A.')).toBe('spyrosoft');
      expect(normalizeCompany('Google Poland Sp. z o.o.')).toBe('google');
      expect(normalizeCompany('Acme Corp.')).toBe('acme');
      expect(normalizeCompany('Tech Solutions Ltd.')).toBe('tech solutions');
    });

    it('returns empty for placeholder generic company names', () => {
      expect(normalizeCompany('Firma')).toBe('');
      expect(normalizeCompany('Portal pracy')).toBe('');
      expect(normalizeCompany('Nieokreślona firma')).toBe('');
    });
  });

  describe('normalizeRole', () => {
    it('normalizes role title and strips accents', () => {
      expect(normalizeRole('Inżynier QA')).toBe('inzynier qa');
      expect(normalizeRole('Senior Frontend Developer')).toBe('senior frontend developer');
    });
  });

  describe('calculateTokenSimilarity', () => {
    it('calculates jaccard word similarity', () => {
      expect(calculateTokenSimilarity('Senior QA Engineer', 'QA Engineer')).toBeGreaterThan(0.5);
      expect(calculateTokenSimilarity('Frontend Developer', 'DevOps Specialist')).toBe(0);
    });
  });

  describe('detectDuplicate multi-parameter verification', () => {
    const existingApps: JobApplication[] = [
      {
        id: 'app-1',
        role: 'QA Engineer',
        company: 'Spyrosoft',
        portal: 'LinkedIn',
        url: 'https://linkedin.com/jobs/view/100?utm_source=feed',
        appliedDate: '2026-03-01',
        status: 'Wysłana',
        location: 'Wrocław',
      },
      {
        id: 'app-2',
        role: 'Senior React Developer',
        company: 'Netguru',
        portal: 'NoFluffJobs',
        url: 'https://nofluffjobs.com/job/react-dev',
        appliedDate: '2026-03-05',
        status: 'Rozmowa HR',
        location: 'Warszawa',
      },
    ];

    it('detects duplicate by exact normalized URL with tracking params stripped', () => {
      const candidate = {
        role: 'Inne Stanowisko',
        company: 'Inna Firma',
        url: 'https://www.linkedin.com/jobs/view/100/',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe('exact');
      expect(result.matchedFields).toContain('url');
      expect(result.matchedId).toBe('app-1');
      expect(result.reason).toContain('Oferta z tym linkiem już istnieje w trackerze');
    });

    it('detects duplicate by company and role (with legal suffix difference)', () => {
      const candidate = {
        role: 'QA Engineer',
        company: 'Spyrosoft S.A.',
        portal: 'Pracuj.pl',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(true);
      expect(result.confidence).toBe('high');
      expect(result.matchedFields).toContain('company');
      expect(result.matchedFields).toContain('role');
      expect(result.reason).toContain('Aplikacja dla Spyrosoft (QA Engineer) już znajduje się w bazie');
    });

    it('detects multi-parameter duplicate matching company, role and applied date', () => {
      const candidate = {
        role: 'QA Engineer',
        company: 'Spyrosoft',
        appliedDate: '2026-03-01',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedFields).toContain('company');
      expect(result.matchedFields).toContain('role');
      expect(result.matchedFields).toContain('appliedDate');
      expect(result.reason).toContain('Zgodność firmy, stanowiska i daty aplikacji');
    });

    it('detects multi-parameter duplicate matching company, role and portal', () => {
      const candidate = {
        role: 'QA Engineer',
        company: 'Spyrosoft',
        portal: 'LinkedIn',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedFields).toContain('portal');
      expect(result.reason).toContain('z portalu LinkedIn');
    });

    it('detects duplicate by close/fuzzy role in the same company', () => {
      const candidate = {
        role: 'React Developer',
        company: 'Netguru',
        portal: 'NoFluffJobs',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(true);
      expect(result.matchedFields).toContain('company');
      expect(result.matchedFields).toContain('role');
    });

    it('ignores application when excludeId matches current editing job', () => {
      const candidate = {
        id: 'app-1',
        role: 'QA Engineer',
        company: 'Spyrosoft',
        url: 'https://linkedin.com/jobs/view/100',
      };

      const result = detectDuplicate(candidate, existingApps, { excludeId: 'app-1' });
      expect(result.isDuplicate).toBe(false);
    });

    it('returns false for completely new job with different company and url', () => {
      const candidate = {
        role: 'DevOps Engineer',
        company: 'Allegro',
        url: 'https://allegro.pl/praca/devops',
      };

      const result = detectDuplicate(candidate, existingApps);
      expect(result.isDuplicate).toBe(false);
    });
  });
});
