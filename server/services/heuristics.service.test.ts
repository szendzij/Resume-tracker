import { describe, it, expect } from 'vitest';
import { deducePortalAndHints, extractHeuristicJob } from './heuristics.service';

describe('server heuristics.service', () => {
  describe('deducePortalAndHints', () => {
    it('should extract portal and role keyword from LinkedIn search URL', () => {
      const url = 'https://www.linkedin.com/jobs/search/?keywords=QA%20Automation%20Engineer';
      const res = deducePortalAndHints(url);

      expect(res.portal).toBe('LinkedIn');
      expect(res.hints.role).toBe('QA Automation Engineer');
    });

    it('should deduce location hint from NoFluffJobs slug', () => {
      const url = 'https://nofluffjobs.com/pl/job/senior-qa-engineer-wroclaw';
      const res = deducePortalAndHints(url);

      expect(res.portal).toBe('NoFluffJobs');
      expect(res.hints.location).toBe('Wrocław');
    });

    it('should deduce known company career portal hints', () => {
      const res = deducePortalAndHints('https://spyro-soft.com/careers/offer');
      expect(res.portal).toBe('Spyrosoft Careers');
      expect(res.hints.company).toBe('Spyrosoft');
    });

    it('should handle malformed URLs gracefully', () => {
      const res = deducePortalAndHints('not-valid');
      expect(res.portal).toBe('Strona pracodawcy');
      expect(res.hints).toEqual({});
    });
  });

  describe('extractHeuristicJob', () => {
    it('should extract role, company and location from pipe separated link title', () => {
      const job = extractHeuristicJob(
        'https://nofluffjobs.com/job/qa',
        'Senior QA Automation | TechCorp | Wrocław',
        'NoFluffJobs'
      );

      expect(job.role).toBe('Senior QA Automation');
      expect(job.company).toBe('TechCorp');
      expect(job.location).toBe('Wrocław');
      expect(job.portal).toBe('NoFluffJobs');
      expect(job.source).toBe('heuristic');
    });

    it('should recognize known pre-curated test fixtures in URLs', () => {
      const job = extractHeuristicJob(
        'https://nofluffjobs.com/pl/job/sportano-com-test-automation-engineer-wroclaw',
        undefined,
        'NoFluffJobs'
      );

      expect(job.company).toBe('Sportano.com');
      expect(job.role).toBe('Test Automation Engineer');
      expect(job.location).toBe('Wrocław');
    });
  });
});
