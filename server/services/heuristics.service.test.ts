import { describe, it, expect } from 'vitest';
import { deducePortalAndHints, extractHeuristicJob, cleanSalary } from './heuristics.service';

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

    it('should never leak offer description into salary field when rawText has offer narrative', () => {
      const rawText = `
        Senior Frontend Engineer
        Firma: Example Corp
        Wynagrodzenie: 18 000 - 24 000 PLN B2B. Szukamy zmotywowanej osoby, która dołączy do naszego dynamicznego zespołu. Oferujemy pracę przy międzynarodowych projektach w nowoczesnym biurze w Warszawie oraz pakiet benefitów Medicover i Multisport.
        Wymagania: React, TypeScript
      `;

      const job = extractHeuristicJob(
        'https://example.com/job/senior-frontend',
        'Senior Frontend Engineer | Example Corp',
        'Inny portal',
        undefined,
        rawText
      );

      expect(job.salary).toBe('18 000 - 24 000 PLN B2B');
      expect(job.salary).not.toContain('Szukamy');
      expect(job.salary).not.toContain('Medicover');
    });
  });

  describe('cleanSalary', () => {
    it('should strip trailing narrative text from salary string', () => {
      const raw = '20 000 - 25 000 PLN netto B2B. Dołącz do naszego zespołu i rozwijaj się w fintechu!';
      const cleaned = cleanSalary(raw);
      expect(cleaned).toBe('20 000 - 25 000 PLN netto B2B');
    });

    it('should reject salary if it is pure text or description without numbers', () => {
      expect(cleanSalary('Atrakcyjne wynagrodzenie uzależnione od doświadczenia oraz pakiet benefitów.')).toBe('');
      expect(cleanSalary(undefined)).toBe('');
    });

    it('should truncate and clean runaway salaries exceeding 70 characters', () => {
      const longNarrative = '15 000 - 20 000 PLN miesięcznie wraz z roczną premią uznaniową, pakietem opieki medycznej Enel-Med, kartą Multisport Plus oraz dofinansowaniem do nauki języka angielskiego.';
      const cleaned = cleanSalary(longNarrative);
      expect(cleaned.length).toBeLessThanOrEqual(70);
      expect(cleaned).toContain('15 000 - 20 000 PLN');
      expect(cleaned).not.toContain('Multisport');
    });

    it('should strip newline characters and keep only the salary line', () => {
      const multiline = '25 000 PLN B2B\nDo Twoich obowiązków należeć będzie projektowanie architektury mikroserwisów.';
      const cleaned = cleanSalary(multiline);
      expect(cleaned).toBe('25 000 PLN B2B');
      expect(cleaned).not.toContain('obowiązków');
    });

    it('should properly recognize Polish formats with zł brutto / netto', () => {
      expect(cleanSalary('12 000 - 16 000 zł brutto')).toBe('12 000 - 16 000 zł brutto');
      expect(cleanSalary('180 - 220 zł/h netto B2B')).toBe('180 - 220 zł/h netto B2B');
    });
  });

  describe('extractHeuristicJob - offer text isolation', () => {
    it('does not leak paragraphs of job description when salary is in the middle of long text', () => {
      const hugeRawText = `
        O nas:
        Jesteśmy liderem w branży e-commerce tworzącym skalowalne platformy webowe dla milionów użytkowników dziennie.
        
        Widełki: 22 000 - 28 000 PLN + VAT (B2B)
        
        Zakres obowiązków:
        - Projektowanie i wdrażanie nowych funkcjonalności w React i Node.js
        - Dbanie o jakość kodu i architekturę
        - Pisanie testów jednostkowych i integracyjnych
        
        Wymagania:
        - Min. 4 lata doświadczenia komercyjnego
        - Bardzo dobra znajomość TypeScript, Tailwind CSS
      `;

      const job = extractHeuristicJob(
        'https://example.com/job/senior-dev',
        'Senior Fullstack Engineer',
        'LinkedIn',
        undefined,
        hugeRawText
      );

      expect(job.salary).toBe('22 000 - 28 000 PLN + VAT (B2B)');
      expect(job.salary).not.toContain('Zakres');
      expect(job.salary).not.toContain('Wymagania');
    });
  });
});

