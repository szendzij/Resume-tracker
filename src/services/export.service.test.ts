import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportApplicationsToCSV } from './export.service';
import { JobApplication } from '../types';

describe('exportApplicationsToCSV', () => {
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

  it('should generate CSV with UTF-8 BOM, headers, semicolon delimiters and trigger download', async () => {
    const testApps: JobApplication[] = [
      {
        id: '1',
        role: 'Senior QA "Lead"',
        company: 'Firma "Test"',
        portal: 'LinkedIn',
        appliedDate: '2026-03-01',
        status: 'Rozmowa HR',
        location: 'Wrocław',
        salary: '18 000 - 22 000 PLN',
        skills: ['Cypress', 'Playwright', 'TypeScript'],
        url: 'https://linkedin.com/jobs/1',
        notes: 'Notatka z polskimi znakami: ąćęłńóśźż',
      },
    ];

    exportApplicationsToCSV(testApps, 'raport-testowy.csv');

    expect(clicked).toBe(true);
    expect(downloadedFilename).toBe('raport-testowy.csv');
    expect(createdBlob).not.toBeNull();

    const text = await createdBlob!.text();

    // Check UTF-8 BOM bytes (0xEF, 0xBB, 0xBF)
    const arrayBuffer = await createdBlob!.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);

    // Check header
    expect(text).toContain('Stanowisko;Firma;Portal;Data wyslania CV;Status;Lokalizacja;Widelki;Technologie;Link;Notatki');

    // Check escaped quotes
    expect(text).toContain('"Senior QA ""Lead"""');
    expect(text).toContain('"Firma ""Test"""');

    // Check polish diacritics preserved
    expect(text).toContain('Notatka z polskimi znakami: ąćęłńóśźż');

    // Check skills joined
    expect(text).toContain('Cypress, Playwright, TypeScript');
  });

  it('should use default filename when not provided', () => {
    exportApplicationsToCSV([]);
    expect(downloadedFilename).toMatch(/^aplikacje-praca-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe('exportApplicationsToJSON', () => {
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

  it('should export formatted JSON backup and trigger download', async () => {
    const testApps: JobApplication[] = [
      {
        id: 'json-1',
        role: 'QA Engineer',
        company: 'Allegro',
        portal: 'Pracuj.pl',
        appliedDate: '2026-03-05',
        status: 'Wysłana',
        url: 'https://allegro.pl/praca/qa',
      },
    ];

    const { exportApplicationsToJSON } = await import('./export.service');
    exportApplicationsToJSON(testApps, 'backup-test.json');

    expect(clicked).toBe(true);
    expect(downloadedFilename).toBe('backup-test.json');
    expect(createdBlob).not.toBeNull();

    const text = await createdBlob!.text();
    const parsed = JSON.parse(text);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].company).toBe('Allegro');
    expect(parsed[0].role).toBe('QA Engineer');
  });
});
