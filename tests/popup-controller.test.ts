import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Set flag so popup.js doesn't auto-init before test is ready
(globalThis as any).__POPUP_TEST_MANUAL_INIT__ = true;

declare const chrome: any;

// We import from extension/popup.js (which doesn't exist yet - RED test)
import {
  normalizeUrl,
  findDuplicate,
  testServerHealth,
  parseJobDetails,
  saveApplication,
  updateApplication,
  initPopup,
} from '../extension/popup.js';

describe('Extension Popup Controller (popup.js)', () => {
  const popupHtmlPath = path.resolve(__dirname, '..', 'extension', 'popup.html');
  let mockStorageData: Record<string, any> = {};
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    // Load popup.html DOM into jsdom document
    const html = fs.readFileSync(popupHtmlPath, 'utf-8');
    document.documentElement.innerHTML = html;

    // Reset storage
    mockStorageData = {
      serverUrl: 'http://localhost:3050',
      customApiKey: '',
    };

    // Setup chrome API mocks
    (globalThis as any).chrome = {
      tabs: {
        query: vi.fn().mockResolvedValue([
          {
            id: 101,
            url: 'https://nofluffjobs.com/job/senior-qa-engineer',
            title: 'Senior QA Engineer - TechCorp - No Fluff Jobs',
          },
        ]),
        create: vi.fn().mockResolvedValue({ id: 102 }),
      },
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              url: 'https://nofluffjobs.com/job/senior-qa-engineer',
              title: 'Senior QA Engineer - TechCorp',
              rawText: 'TechCorp poszukuje Senior QA Engineera. Wymagania: Playwright, TypeScript, CI/CD.',
              selectedText: '',
              metaDescription: 'Praca dla Senior QA',
            },
          },
        ]),
      },
      storage: {
        sync: {
          get: vi.fn().mockImplementation((keys: string[] | Record<string, any>, cb?: Function) => {
            const res: Record<string, any> = {};
            const keyList = Array.isArray(keys) ? keys : Object.keys(keys);
            for (const k of keyList) {
              res[k] = mockStorageData[k];
            }
            if (typeof cb === 'function') {
              cb(res);
              return;
            }
            return Promise.resolve(res);
          }),
          set: vi.fn().mockImplementation((items: Record<string, any>, cb?: Function) => {
            Object.assign(mockStorageData, items);
            if (typeof cb === 'function') {
              cb();
              return;
            }
            return Promise.resolve();
          }),
        },
      },
    };

    // Save and mock fetch
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/health')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: 'ok', timestamp: new Date().toISOString() }),
        };
      }
      if (urlStr.includes('/api/applications') && (!options || options.method === 'GET')) {
        return {
          ok: true,
          status: 200,
          json: async () => [],
        };
      }
      if (urlStr.includes('/api/jobs/parse-job')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            role: 'Senior QA Engineer',
            company: 'TechCorp',
            location: 'Warszawa (Zdalnie)',
            salary: '18 000 - 24 000 PLN',
            portal: 'NoFluffJobs',
            skills: ['Playwright', 'TypeScript', 'CI/CD'],
            notes: 'Świetna oferta z NoFluffJobs',
            source: 'gemini',
          }),
        };
      }
      if (urlStr.includes('/api/applications') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ ...body, id: 'saved-app-1' }),
        };
      }
      if (urlStr.includes('/api/applications/') && options?.method === 'PUT') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...body }),
        };
      }
      return {
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' }),
      };
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  describe('Helper Functions', () => {
    describe('normalizeUrl', () => {
      it('removes marketing tracking query params (utm_*, fbclid, gclid, etc.) and trailing slash', () => {
        const raw = 'https://pracuj.pl/praca/qa,oferta,12345/?utm_source=linkedin&utm_campaign=ad&fbclid=abc123xyz/';
        const cleaned = normalizeUrl(raw);
        expect(cleaned).toBe('https://pracuj.pl/praca/qa,oferta,12345');
      });

      it('preserves clean URL without trailing slash and lowercases protocol and domain', () => {
        const raw = 'HTTPS://WWW.LINKEDIN.COM/jobs/view/99999/';
        const cleaned = normalizeUrl(raw);
        expect(cleaned).toBe('https://linkedin.com/jobs/view/99999');
      });

      it('handles empty or invalid inputs gracefully', () => {
        expect(normalizeUrl('')).toBe('');
        expect(normalizeUrl(null as any)).toBe('');
      });
    });

    describe('findDuplicate', () => {
      const existingApps = [
        {
          id: 'app-1',
          role: 'QA Engineer',
          company: 'Acme Corp',
          url: 'https://example.com/job/1',
          status: 'Wysłana' as const,
          appliedDate: '2026-03-01',
          portal: 'LinkedIn',
        },
        {
          id: 'app-2',
          role: 'Frontend Developer',
          company: 'Beta Sp. z o.o.',
          url: 'https://example.com/job/2',
          status: 'Rozmowa HR' as const,
          appliedDate: '2026-03-10',
          portal: 'Pracuj.pl',
        },
      ];

      it('identifies duplicate by exact normalized URL', () => {
        const dup = findDuplicate(existingApps, {
          url: 'https://example.com/job/1?utm_medium=cpc',
          company: 'Inna Nazwa',
          role: 'Inne Stanowisko',
        });
        expect(dup).toBeDefined();
        expect((dup as any)?.id).toBe('app-1');
      });

      it('identifies duplicate by case-insensitive trimmed company and role', () => {
        const dup = findDuplicate(existingApps, {
          url: 'https://other-url.com/something',
          company: '  acme corp  ',
          role: 'qa engineer ',
        });
        expect(dup).toBeDefined();
        expect((dup as any)?.id).toBe('app-1');
      });

      it('returns null when no duplicate matches', () => {
        const dup = findDuplicate(existingApps, {
          url: 'https://unique-offer.com',
          company: 'NewCo',
          role: 'DevOps Specialist',
        });
        expect(dup).toBeNull();
      });
    });

    describe('testServerHealth', () => {
      it('returns ok: true when /api/health responds with 200 ok', async () => {
        const res = await testServerHealth('http://localhost:3050');
        expect(res.ok).toBe(true);
      });

      it('returns ok: false when /api/health fails or throws error', async () => {
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
        const res = await testServerHealth('http://localhost:3050');
        expect(res.ok).toBe(false);
        expect(res.error).toBeDefined();
      });
    });

    describe('parseJobDetails', () => {
      it('calls /api/jobs/parse-job with url, title, and rawText', async () => {
        const res = await parseJobDetails('http://localhost:3050', {
          url: 'https://test.com',
          linkTitle: 'QA Lead',
          rawText: 'Job description text',
        });
        expect((res as any).role).toBe('Senior QA Engineer');
        expect((res as any).company).toBe('TechCorp');
        expect(globalThis.fetch).toHaveBeenCalledWith(
          'http://localhost:3050/api/jobs/parse-job',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
          })
        );
      });

      it('passes customApiKey in headers or body if provided', async () => {
        await parseJobDetails(
          'http://localhost:3050',
          { url: 'https://test.com', linkTitle: 'QA Lead', rawText: 'Job description' },
          'custom-key-123'
        );
        expect(globalThis.fetch).toHaveBeenCalledWith(
          'http://localhost:3050/api/jobs/parse-job',
          expect.objectContaining({
            headers: expect.objectContaining({ 'x-gemini-key': 'custom-key-123' }),
          })
        );
      });
    });

    describe('saveApplication and updateApplication', () => {
      it('saveApplication calls POST /api/applications with application payload', async () => {
        const appPayload = {
          role: 'Senior QA',
          company: 'TechCorp',
          portal: 'NoFluffJobs',
          url: 'https://test.com',
          appliedDate: '2026-03-15',
          status: 'Do zaaplikowania' as const,
        };
        const result = await saveApplication('http://localhost:3050', appPayload);
        expect((result as any).id).toBe('saved-app-1');
        expect(globalThis.fetch).toHaveBeenCalledWith(
          'http://localhost:3050/api/applications',
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('updateApplication calls PUT /api/applications/:id with application payload', async () => {
        const appPayload = {
          role: 'Senior QA Updated',
          company: 'TechCorp',
          portal: 'NoFluffJobs',
          url: 'https://test.com',
          appliedDate: '2026-03-15',
          status: 'Wysłana' as const,
        };
        const result = await updateApplication('http://localhost:3050', 'app-999', appPayload);
        expect((result as any).role).toBe('Senior QA Updated');
        expect(globalThis.fetch).toHaveBeenCalledWith(
          'http://localhost:3050/api/applications/app-999',
          expect.objectContaining({ method: 'PUT' })
        );
      });
    });
  });

  describe('UI Controller & Workflows', () => {
    it('executes normal extraction and populates form fields and skill chips', async () => {
      await initPopup();

      // View should transition to form
      const viewForm = document.getElementById('view-form');
      const viewLoading = document.getElementById('view-loading');
      expect(viewLoading?.classList.contains('hidden')).toBe(true);
      expect(viewForm?.classList.contains('hidden')).toBe(false);

      // Form fields populated
      const roleInput = document.getElementById('field-role') as HTMLInputElement;
      const companyInput = document.getElementById('field-company') as HTMLInputElement;
      const locationInput = document.getElementById('field-location') as HTMLInputElement;
      const salaryInput = document.getElementById('field-salary') as HTMLInputElement;
      const portalInput = document.getElementById('field-portal') as HTMLInputElement;
      const statusSelect = document.getElementById('field-status') as HTMLSelectElement;

      expect(roleInput.value).toBe('Senior QA Engineer');
      expect(companyInput.value).toBe('TechCorp');
      expect(locationInput.value).toBe('Warszawa (Zdalnie)');
      expect(salaryInput.value).toBe('18 000 - 24 000 PLN');
      expect(portalInput.value).toBe('NoFluffJobs');
      expect(statusSelect.value).toBe('Do zaaplikowania');

      // Skills rendered
      const skillsContainer = document.getElementById('skills-container');
      expect(skillsContainer?.textContent).toContain('Playwright');
      expect(skillsContainer?.textContent).toContain('TypeScript');
      expect(skillsContainer?.textContent).toContain('CI/CD');

      // Duplicate banner is hidden for fresh job
      const dupBanner = document.getElementById('duplicate-banner');
      expect(dupBanner?.classList.contains('hidden')).toBe(true);
    });

    it('allows adding and removing skill chips dynamically', async () => {
      await initPopup();

      const skillsContainer = document.getElementById('skills-container')!;
      const inputSkill = document.getElementById('input-new-skill') as HTMLInputElement;
      const btnAddSkill = document.getElementById('btn-add-skill') as HTMLButtonElement;

      // Add new skill
      inputSkill.value = 'Cypress';
      btnAddSkill.click();

      expect(skillsContainer.textContent).toContain('Cypress');
      expect(inputSkill.value).toBe('');

      // Remove a skill
      const removeBtn = skillsContainer.querySelector('.skill-remove') as HTMLButtonElement;
      expect(removeBtn).not.toBeNull();
      removeBtn.click();

      // Check skill was removed
      expect(skillsContainer.querySelectorAll('.skill-chip').length).toBe(3); // was 3+1-1 = 3
    });

    it('toggles work type pill selection and selects work type', async () => {
      await initPopup();

      const remotePill = document.querySelector('.pill-btn[data-value="Zdalnie"]') as HTMLButtonElement;
      const hybridPill = document.querySelector('.pill-btn[data-value="Hybrydowo"]') as HTMLButtonElement;

      expect(remotePill).not.toBeNull();
      expect(hybridPill).not.toBeNull();

      // Remote might be auto-selected because location says "Zdalnie"
      hybridPill.click();
      expect(hybridPill.classList.contains('active')).toBe(true);
      expect(remotePill.classList.contains('active')).toBe(false);
    });

    it('submits form, saves application, appends full text if checked, and transitions to success view', async () => {
      await initPopup();

      const chkFullText = document.getElementById('chk-include-full-text') as HTMLInputElement;
      chkFullText.checked = true;

      const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
      btnSave.click();

      // Wait a tick for async save
      await new Promise((resolve) => setTimeout(resolve, 50));

      const viewSuccess = document.getElementById('view-success');
      const viewForm = document.getElementById('view-form');
      expect(viewForm?.classList.contains('hidden')).toBe(true);
      expect(viewSuccess?.classList.contains('hidden')).toBe(false);

      // Verify POST call included full text in notes
      const postCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) =>
        c[0].includes('/api/applications') && c[1]?.method === 'POST'
      );
      expect(postCalls.length).toBe(1);
      const savedBody = JSON.parse(postCalls[0][1].body);
      expect(savedBody.notes).toContain('Pełna treść ogłoszenia');
      expect(savedBody.notes).toContain('Playwright, TypeScript, CI/CD');

      // Test open app button
      const btnOpenApp = document.getElementById('btn-open-app') as HTMLButtonElement;
      btnOpenApp.click();
      expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'http://localhost:3050' });
    });

    it('detects duplicate job and shows banner with update and save-new options', async () => {
      // Mock /api/applications returning matching duplicate
      globalThis.fetch = vi.fn().mockImplementation(async (url: string, options?: any) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/health')) {
          return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
        }
        if (urlStr.includes('/api/applications') && (!options || options.method === 'GET')) {
          return {
            ok: true,
            status: 200,
            json: async () => [
              {
                id: 'existing-dup-1',
                role: 'Senior QA Engineer',
                company: 'TechCorp',
                url: 'https://nofluffjobs.com/job/senior-qa-engineer',
                status: 'Rozmowa HR',
                appliedDate: '2026-02-20',
                portal: 'NoFluffJobs',
              },
            ],
          };
        }
        if (urlStr.includes('/api/jobs/parse-job')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              role: 'Senior QA Engineer',
              company: 'TechCorp',
              portal: 'NoFluffJobs',
              skills: ['TypeScript'],
              notes: 'Duplicate offer',
            }),
          };
        }
        if (urlStr.includes('/api/applications/') && options?.method === 'PUT') {
          return { ok: true, status: 200, json: async () => ({ ...JSON.parse(options.body) }) };
        }
        return { ok: true, status: 200, json: async () => ({ id: 'new-id' }) };
      }) as any;

      await initPopup();

      const dupBanner = document.getElementById('duplicate-banner');
      expect(dupBanner?.classList.contains('hidden')).toBe(false);

      const dupText = document.getElementById('duplicate-text');
      expect(dupText?.textContent).toMatch(/Oferta już w bazie.*Rozmowa HR/i);
      expect(dupText?.textContent).toMatch(/2026-02-20/);

      // Clicking update triggers PUT /api/applications/existing-dup-1
      const btnUpdate = document.getElementById('btn-update') as HTMLButtonElement;
      btnUpdate.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const putCalls = (globalThis.fetch as any).mock.calls.filter((c: any[]) =>
        c[0].includes('/api/applications/existing-dup-1') && c[1]?.method === 'PUT'
      );
      expect(putCalls.length).toBe(1);

      const viewSuccess = document.getElementById('view-success');
      expect(viewSuccess?.classList.contains('hidden')).toBe(false);
    });

    it('handles restricted browser pages (chrome://, about:) by showing view-error with explanatory message', async () => {
      (chrome.tabs.query as any).mockResolvedValue([
        {
          id: 105,
          url: 'chrome://extensions',
          title: 'Rozszerzenia',
        },
      ]);

      await initPopup();

      const viewError = document.getElementById('view-error');
      const viewLoading = document.getElementById('view-loading');
      expect(viewLoading?.classList.contains('hidden')).toBe(true);
      expect(viewError?.classList.contains('hidden')).toBe(false);

      const errorMsg = document.getElementById('error-message');
      expect(errorMsg?.textContent).toContain('Wtyczka działa na stronach z ofertami pracy');
    });

    it('handles offline backend network error gracefully and allows retry and settings navigation', async () => {
      // Mock fetch throwing network error
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (ERR_CONNECTION_REFUSED)'));

      await initPopup();

      const viewError = document.getElementById('view-error');
      expect(viewError?.classList.contains('hidden')).toBe(false);

      const errorMsg = document.getElementById('error-message');
      expect(errorMsg?.textContent).toMatch(/Nie udało się połączyć z serwerem Resume Tracker/i);

      // Navigate to settings from error view
      const btnGotoSettings = document.getElementById('btn-goto-settings') as HTMLButtonElement;
      btnGotoSettings.click();

      const viewSettings = document.getElementById('view-settings');
      expect(viewSettings?.classList.contains('hidden')).toBe(false);
      expect(viewError?.classList.contains('hidden')).toBe(true);
    });

    it('allows testing server connection and saving settings in settings view', async () => {
      await initPopup();

      const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
      btnSettings.click();

      const viewSettings = document.getElementById('view-settings');
      expect(viewSettings?.classList.contains('hidden')).toBe(false);

      const inputUrl = document.getElementById('input-server-url') as HTMLInputElement;
      inputUrl.value = 'http://192.168.1.150:3050';

      const inputApiKey = document.getElementById('input-custom-api-key') as HTMLInputElement;
      inputApiKey.value = 'gemini-user-key-xyz';

      // Test connection button
      const btnTestConnection = document.getElementById('btn-test-connection') as HTMLButtonElement;
      btnTestConnection.click();

      await new Promise((resolve) => setTimeout(resolve, 50));

      const testStatus = document.getElementById('test-connection-status');
      expect(testStatus?.textContent).toMatch(/Połączono/i);
      expect(testStatus?.classList.contains('success')).toBe(true);

      // Save settings
      const btnSaveSettings = document.getElementById('btn-save-settings') as HTMLButtonElement;
      btnSaveSettings.click();

      expect(chrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          serverUrl: 'http://192.168.1.150:3050',
          customApiKey: 'gemini-user-key-xyz',
        })
      );

      // Back button
      const btnBack = document.getElementById('btn-back-from-settings') as HTMLButtonElement;
      btnBack.click();

      const viewForm = document.getElementById('view-form');
      expect(viewForm?.classList.contains('hidden')).toBe(false);
      expect(viewSettings?.classList.contains('hidden')).toBe(true);
    });

    it('updates loading checklist step states and handles manual entry fallback on error', async () => {
      // First attempt fails to check error and fallback actions
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/jobs/parse-job')) {
          return Promise.reject(new Error('AI Service Unavailable'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => [],
        });
      });

      await initPopup();

      const stepAi = document.getElementById('step-ai');
      expect(stepAi?.classList.contains('step-error')).toBe(true);

      const errorBox = document.getElementById('loading-error-actions');
      expect(errorBox?.classList.contains('hidden')).toBe(false);

      // User clicks manual fallback button
      const btnManual = document.getElementById('btn-loading-manual') as HTMLButtonElement;
      btnManual.click();

      const viewForm = document.getElementById('view-form');
      expect(viewForm?.classList.contains('hidden')).toBe(false);

      const roleInput = document.getElementById('field-role') as HTMLInputElement;
      expect(roleInput.value).toBe('Senior QA Engineer - TechCorp');
    });
  });
});
