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

    it('should extract company, role, salary, workType and skills from theprotocol.it rawText', () => {
      const rawText = `
        Senior IT Automation Tester (Python + Robot Framework)
        Firma: OPTIVEUM SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
        Gdańsk, pomorskie
        120 - 120 zł netto (+ VAT) / godz.
        tryb pracy: hybrydowa
        Wymagania: Python, Robot Framework, XML, CSV, JSON, Microsoft SQL Server, SQL, Jenkins, Bamboo, Git, Atlassian, Jira, Confluence
      `;

      const job = extractHeuristicJob(
        'https://theprotocol.it/filtry/qa/praca?kw=Senior%20IT%20Automation%20Tester',
        'Senior IT Automation Tester (Python + Robot Framework) - The Protocol',
        'The Protocol',
        undefined,
        rawText
      );

      expect(job.role).toBe('Senior IT Automation Tester (Python + Robot Framework)');
      expect(job.company).toBe('Optiveum');
      expect(job.location).toBe('Gdańsk, pomorskie');
      expect(job.salary).toBe('120 - 120 zł netto (+ VAT) / godz.');
      expect(job.workType).toBe('Hybrydowo');
      expect(job.portal).toBe('The Protocol');
      expect(job.skills).toContain('Python');
      expect(job.skills).toContain('Robot Framework');
      expect(job.skills).toContain('SQL');
      expect(job.skills).toContain('Jenkins');
      expect(job.skills).toContain('Git');
      expect(job.skills).toContain('Jira');
      // Must NEVER set company to portal
      expect(job.company).not.toBe('The Protocol');
    });
  });
});
