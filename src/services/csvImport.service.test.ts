import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  stripBOM,
  detectDelimiter,
  parseCsvToMatrix,
  guessFieldFromHeader,
  normalizeDate,
  normalizeStatus,
  normalizeSkills,
  checkDuplicate,
  parseCsvApplications,
  downloadSampleCsvTemplate,
} from './csvImport.service';
import { JobApplication } from '../types';

describe('csvImport.service', () => {
  it('stripBOM should remove UTF-8 BOM character', () => {
    const withBom = '\uFEFFStanowisko;Firma';
    expect(stripBOM(withBom)).toBe('Stanowisko;Firma');
    expect(stripBOM('BezBOM;Firma')).toBe('BezBOM;Firma');
  });

  describe('detectDelimiter', () => {
    it('detects semicolon delimiter', () => {
      const text = 'Stanowisko;Firma;Data\nQA;Google;2026-03-01\nTester;Microsoft;2026-03-02';
      expect(detectDelimiter(text)).toBe(';');
    });

    it('detects comma delimiter', () => {
      const text = 'Role,Company,Date\nQA,Google,2026-03-01\nTester,Microsoft,2026-03-02';
      expect(detectDelimiter(text)).toBe(',');
    });

    it('detects tab delimiter', () => {
      const text = 'Role\tCompany\tDate\nQA\tGoogle\t2026-03-01';
      expect(detectDelimiter(text)).toBe('\t');
    });
  });

  describe('parseCsvToMatrix (RFC 4180 parsing)', () => {
    it('parses standard semicolon delimited CSV with quotes and commas inside cells', () => {
      const csv = `"Stanowisko";"Firma";"Notatki"\n"Senior QA, Automation";"Test Corp, Ltd.";"Notatka 1"`;
      const matrix = parseCsvToMatrix(csv, ';');
      expect(matrix.length).toBe(2);
      expect(matrix[0]).toEqual(['Stanowisko', 'Firma', 'Notatki']);
      expect(matrix[1]).toEqual(['Senior QA, Automation', 'Test Corp, Ltd.', 'Notatka 1']);
    });

    it('handles escaped double quotes properly', () => {
      const csv = `"Role";"Company"\n"QA ""Lead"" Engineer";"Firma ""Best"""`;
      const matrix = parseCsvToMatrix(csv, ';');
      expect(matrix[1][0]).toBe('QA "Lead" Engineer');
      expect(matrix[1][1]).toBe('Firma "Best"');
    });

    it('handles multi-line values within quotes', () => {
      const csv = `"Role";"Notes"\n"QA";"Pierwsza linia\nDruga linia notatki"`;
      const matrix = parseCsvToMatrix(csv, ';');
      expect(matrix.length).toBe(2);
      expect(matrix[1][1]).toBe('Pierwsza linia\nDruga linia notatki');
    });
  });

  describe('guessFieldFromHeader', () => {
    it('maps Polish and English headers to correct target fields', () => {
      expect(guessFieldFromHeader('Stanowisko')).toBe('role');
      expect(guessFieldFromHeader('Rola')).toBe('role');
      expect(guessFieldFromHeader('Job Title')).toBe('role');

      expect(guessFieldFromHeader('Firma')).toBe('company');
      expect(guessFieldFromHeader('Pracodawca')).toBe('company');
      expect(guessFieldFromHeader('Company')).toBe('company');

      expect(guessFieldFromHeader('Data wyslania CV')).toBe('appliedDate');
      expect(guessFieldFromHeader('Data')).toBe('appliedDate');
      expect(guessFieldFromHeader('Applied Date')).toBe('appliedDate');

      expect(guessFieldFromHeader('Status')).toBe('status');
      expect(guessFieldFromHeader('Lokalizacja')).toBe('location');
      expect(guessFieldFromHeader('Widełki')).toBe('salary');
      expect(guessFieldFromHeader('Widelki')).toBe('salary');
      expect(guessFieldFromHeader('Technologie')).toBe('skills');
      expect(guessFieldFromHeader('Link')).toBe('url');
      expect(guessFieldFromHeader('Notatki')).toBe('notes');
    });
  });

  describe('normalizeDate', () => {
    it('preserves YYYY-MM-DD', () => {
      expect(normalizeDate('2026-03-24')).toBe('2026-03-24');
    });

    it('converts DD.MM.YYYY to YYYY-MM-DD', () => {
      expect(normalizeDate('15.03.2026')).toBe('2026-03-15');
      expect(normalizeDate('5.3.2026')).toBe('2026-03-05');
    });

    it('converts DD-MM-YYYY to YYYY-MM-DD', () => {
      expect(normalizeDate('20-04-2026')).toBe('2026-04-20');
    });

    it('falls back to defaultDate when empty or invalid', () => {
      expect(normalizeDate('', '2026-01-01')).toBe('2026-01-01');
      expect(normalizeDate('niepoprawna data', '2026-01-01')).toBe('2026-01-01');
    });
  });

  describe('normalizeStatus', () => {
    it('recognizes exact Polish status names', () => {
      expect(normalizeStatus('Wysłana')).toBe('Wysłana');
      expect(normalizeStatus('Rozmowa HR')).toBe('Rozmowa HR');
      expect(normalizeStatus('Oferta')).toBe('Oferta');
    });

    it('normalizes informal and English equivalents', () => {
      expect(normalizeStatus('rejected')).toBe('Odrzucona');
      expect(normalizeStatus('odrzucona')).toBe('Odrzucona');
      expect(normalizeStatus('offer')).toBe('Oferta');
      expect(normalizeStatus('zadanie')).toBe('Zadanie rekrutacyjne');
      expect(normalizeStatus('technical interview')).toBe('Rozmowa techniczna');
      expect(normalizeStatus('screening cv')).toBe('Weryfikacja CV');
      expect(normalizeStatus('rezygnacja')).toBe('Zrezygnowano');
    });

    it('uses fallback status when unrecognized', () => {
      expect(normalizeStatus('Nieznany', 'Weryfikacja CV')).toBe('Weryfikacja CV');
    });
  });

  describe('normalizeSkills', () => {
    it('splits by comma or semicolon and cleans spaces', () => {
      expect(normalizeSkills('Playwright, Cypress; TypeScript / SQL')).toEqual([
        'Playwright',
        'Cypress',
        'TypeScript',
        'SQL',
      ]);
    });
  });

  describe('checkDuplicate', () => {
    const existing: JobApplication[] = [
      {
        id: '1',
        role: 'QA Engineer',
        company: 'Spyrosoft',
        portal: 'LinkedIn',
        url: 'https://spyro-soft.com/job/1',
        appliedDate: '2026-03-01',
        status: 'Wysłana',
      },
    ];

    it('identifies duplicate by identical URL', () => {
      const res = checkDuplicate('Inne Stanowisko', 'Inna Firma', 'https://spyro-soft.com/job/1/', existing);
      expect(res.isDuplicate).toBe(true);
    });

    it('identifies duplicate by company and role match', () => {
      const res = checkDuplicate('QA Engineer', 'spyrosoft', undefined, existing);
      expect(res.isDuplicate).toBe(true);
    });

    it('returns false for new distinct application', () => {
      const res = checkDuplicate('DevOps Engineer', 'Nowa Firma', 'https://nowafirma.pl/job', existing);
      expect(res.isDuplicate).toBe(false);
    });
  });

  describe('parseCsvApplications full flow', () => {
    it('parses exported CSV format correctly with 2 items', () => {
      const csvContent =
        '\uFEFFStanowisko;Firma;Portal;Data wyslania CV;Status;Lokalizacja;Widelki;Technologie;Link;Notatki\n' +
        '"Senior QA Automation";"Allegro";"Pracuj.pl";"2026-03-10";"Rozmowa HR";"Warszawa";"20 000 PLN";"Playwright, TS";"https://allegro.pl/1";"Notatka A"\n' +
        '"QA Manual Tester";"Spyrosoft";"NoFluffJobs";"12.03.2026";"Wysłana";"Remote";"10 000 PLN";"Postman, Jira";"https://spyro-soft.com/2";"Notatka B"';

      const result = parseCsvApplications(csvContent);

      expect(result.totalRows).toBe(2);
      expect(result.items.length).toBe(2);

      const first = result.items[0];
      expect(first.role).toBe('Senior QA Automation');
      expect(first.company).toBe('Allegro');
      expect(first.portal).toBe('Pracuj.pl');
      expect(first.appliedDate).toBe('2026-03-10');
      expect(first.status).toBe('Rozmowa HR');
      expect(first.location).toBe('Warszawa');
      expect(first.salary).toBe('20 000 PLN');
      expect(first.skills).toEqual(['Playwright', 'TS']);
      expect(first.url).toBe('https://allegro.pl/1');
      expect(first.notes).toBe('Notatka A');
      expect(first.isValid).toBe(true);

      const second = result.items[1];
      expect(second.role).toBe('QA Manual Tester');
      expect(second.company).toBe('Spyrosoft');
      expect(second.appliedDate).toBe('2026-03-12'); // Converted from 12.03.2026
      expect(second.status).toBe('Wysłana');
    });

    it('handles comma delimited CSV with English headers', () => {
      const csvContent =
        'Role,Company,Location,Salary,Status,Date\n' +
        'QA Lead,Google,"Krakow, Poland",30000 PLN,Offer,2026-02-28';

      const result = parseCsvApplications(csvContent);

      expect(result.delimiterUsed).toBe(',');
      expect(result.items.length).toBe(1);
      expect(result.items[0].role).toBe('QA Lead');
      expect(result.items[0].company).toBe('Google');
      expect(result.items[0].location).toBe('Krakow, Poland');
      expect(result.items[0].salary).toBe('30000 PLN');
      expect(result.items[0].status).toBe('Oferta');
      expect(result.items[0].appliedDate).toBe('2026-02-28');
    });
  });

  describe('downloadSampleCsvTemplate', () => {
    let createdBlob: Blob | null = null;
    let clicked = false;
    let downloadedFilename = '';

    beforeEach(() => {
      createdBlob = null;
      clicked = false;
      downloadedFilename = '';

      vi.stubGlobal('URL', {
        createObjectURL: vi.fn((blob: Blob) => {
          createdBlob = blob;
          return 'blob:mock-url';
        }),
        revokeObjectURL: vi.fn(),
      });

      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        clicked = true;
        downloadedFilename = this.getAttribute('download') || '';
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('triggers download of sample CSV template', async () => {
      downloadSampleCsvTemplate();

      expect(clicked).toBe(true);
      expect(downloadedFilename).toBe('szablon-importu-ofert.csv');
      expect(createdBlob).not.toBeNull();

      const text = await createdBlob!.text();
      expect(text).toContain('Stanowisko;Firma;Portal;Data wyslania CV');
      expect(text).toContain('Allegro');
      expect(text).toContain('TypeScript');
    });
  });
});
