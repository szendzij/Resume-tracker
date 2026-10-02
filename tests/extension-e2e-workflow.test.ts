(globalThis as any).__POPUP_TEST_MANUAL_INIT__ = true;

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { app } from '../server/app';
import { dbService } from '../server/services/db.service';
import { extractJobOfferData } from '../extension/extractor.js';
import {
  findDuplicate,
  testServerHealth,
  parseJobDetails,
  saveApplication,
  updateApplication,
} from '../extension/popup.js';

describe('Extension & Backend End-to-End Workflow Integration', () => {
  let server: http.Server;
  let baseUrl: string;
  const createdAppIds: string[] = [];
  const testRunId = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  beforeAll(async () => {
    // Ensure database and schema are initialized
    await dbService.initDatabase();

    // Start Express application on ephemeral port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up created test applications from database
    for (const id of createdAppIds) {
      try {
        await dbService.deleteApplication(id);
      } catch {
        // Ignore cleanup errors
      }
    }

    // Terminate HTTP server
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // Step 1: Preflight OPTIONS /api/health with Chrome PNA headers
  describe('Step 1: PNA Preflight and Health Check', () => {
    it('OPTIONS /api/health responds with status 204 and Private Network Access headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'chrome-extension://e2e-test-extension-id',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Private-Network': 'true',
        },
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('access-control-allow-origin')).toBe('*');
      expect(res.headers.get('access-control-allow-private-network')).toBe('true');
      expect(res.headers.get('access-control-allow-methods')).toContain('GET');
      expect(res.headers.get('access-control-allow-methods')).toContain('POST');
      expect(res.headers.get('access-control-allow-methods')).toContain('PUT');
    });

    it('GET /api/health returns 200 with PNA headers and status ok via testServerHealth', async () => {
      const healthCheck = await testServerHealth(baseUrl);

      expect(healthCheck.ok).toBe(true);
      expect(healthCheck.data).toBeDefined();
      const healthData = healthCheck.data as any;
      expect(healthData.status).toBe('ok');
      expect(healthData.timestamp).toBeDefined();

      const rawRes = await fetch(`${baseUrl}/api/health`);
      expect(rawRes.headers.get('access-control-allow-private-network')).toBe('true');
      expect(rawRes.headers.get('access-control-allow-origin')).toBe('*');
    });
  });

  // Step 2: Parsing job request with rawText via POST /api/jobs/parse-job
  describe('Step 2: Job Parsing via POST /api/jobs/parse-job', () => {
    const candidatePayload = {
      url: `https://nofluffjobs.com/job/senior-qa-automation-${testRunId}`,
      linkTitle: 'Senior QA Automation Engineer - TechCorp Poland - No Fluff Jobs',
      rawText: `
        TechCorp Poland poszukuje doświadczonego Senior QA Automation Engineer.
        Lokalizacja: Warszawa / Hybrydowo
        Wynagrodzenie: 20 000 - 25 000 PLN netto B2B
        Wymagania: Playwright, TypeScript, CI/CD, Docker, Test Automation
        Opis: Będziesz tworzyć framework testowy od podstaw i automatyzować procesy CI/CD.
      `,
    };

    it('parses job via POST /api/jobs/parse-job and returns structured data', async () => {
      const res = await fetch(`${baseUrl}/api/jobs/parse-job`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidatePayload),
      });

      expect(res.status).toBe(200);
      const data = await res.json();

      expect(data).toBeDefined();
      expect(data.role).toBeTruthy();
      expect(data.portal).toBe('NoFluffJobs');
      expect(Array.isArray(data.skills)).toBe(true);
      expect(data.source).toBeDefined();
    });

    it('parses job details via parseJobDetails controller function from popup.js', async () => {
      const parsedData: any = await parseJobDetails(baseUrl, candidatePayload);

      expect(parsedData).toBeDefined();
      expect(parsedData.role).toBeTruthy();
      expect(parsedData.company).toBeTruthy();
      expect(parsedData.portal).toBe('NoFluffJobs');
      expect(Array.isArray(parsedData.skills)).toBe(true);
      expect(parsedData.skills.length).toBeGreaterThan(0);
    });

    it('handles fallback resilience gracefully when API key is omitted or invalid', async () => {
      const res = await fetch(`${baseUrl}/api/jobs/parse-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': 'invalid-test-key-fallback',
        },
        body: JSON.stringify({
          url: 'https://justjoin.it/job-offer/test-qa-role',
          linkTitle: 'QA Lead - FinTech Solutions - Just Join IT',
          rawText: 'Test excerpt for fallback resilience',
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.portal).toBe('Just Join IT');
      expect(data.role).toBeTruthy();
      expect(Array.isArray(data.skills)).toBe(true);
      expect(['gemini', 'fallback', 'heuristic']).toContain(data.source);
    });
  });

  // Step 3: Duplicate checking
  describe('Step 3: Duplicate Checking via GET /api/applications', () => {
    it('returns empty/non-matching duplicate for a new unseen offer', async () => {
      const res = await fetch(`${baseUrl}/api/applications`);
      expect(res.status).toBe(200);
      const existingApps = await res.json();
      expect(Array.isArray(existingApps)).toBe(true);

      const candidateJob = {
        url: `https://nofluffjobs.com/job/senior-qa-automation-${testRunId}`,
        company: `UniqueCorp-${testRunId}`,
        role: 'Senior QA Automation Engineer',
      };

      const duplicate = findDuplicate(existingApps, candidateJob);
      expect(duplicate).toBeNull();
    });
  });

  // Step 4: Saving application with 'Do zaaplikowania' status
  describe('Step 4: Saving Application with "Do zaaplikowania" Status', () => {
    const testAppId = `ext-e2e-${testRunId}`;

    it('saves application with "Do zaaplikowania" status via POST /api/applications', async () => {
      createdAppIds.push(testAppId);

      const applicationPayload = {
        id: testAppId,
        role: 'Senior QA Automation Engineer',
        company: `TechCorp Poland ${testRunId}`,
        portal: 'NoFluffJobs',
        url: `https://nofluffjobs.com/job/senior-qa-automation-${testRunId}`,
        appliedDate: new Date().toISOString().split('T')[0],
        status: 'Do zaaplikowania' as const,
        salary: '20 000 - 25 000 PLN',
        location: 'Warszawa / Hybrydowo',
        skills: ['TypeScript', 'Playwright', 'CI/CD'],
        notes: 'Zapisano bezpośrednio przez rozszerzenie Chrome',
        timeline: [
          {
            id: `tl-${testRunId}`,
            status: 'Do zaaplikowania',
            date: new Date().toISOString().split('T')[0],
            note: 'Zapisano przez wtyczkę Chrome',
          },
        ],
      };

      const saved: any = await saveApplication(baseUrl, applicationPayload);

      expect(saved).toBeDefined();
      expect(saved.id).toBe(testAppId);
      expect(saved.role).toBe('Senior QA Automation Engineer');
      expect(saved.company).toBe(`TechCorp Poland ${testRunId}`);
      expect(saved.status).toBe('Do zaaplikowania');
      expect(saved.salary).toBe('20 000 - 25 000 PLN');
      expect(saved.skills).toEqual(['TypeScript', 'Playwright', 'CI/CD']);
    });
  });

  // Step 5: Retrieving from database with parsed JSON fields
  describe('Step 5: Database Retrieval and Parsed JSON Fields Verification', () => {
    const testAppId = `ext-e2e-${testRunId}`;

    it('retrieves saved application via GET /api/applications/:id and verifies fields', async () => {
      const res = await fetch(`${baseUrl}/api/applications/${testAppId}`);
      expect(res.status).toBe(200);

      const appData = await res.json();
      expect(appData.id).toBe(testAppId);
      expect(appData.role).toBe('Senior QA Automation Engineer');
      expect(appData.company).toBe(`TechCorp Poland ${testRunId}`);
      expect(appData.status).toBe('Do zaaplikowania');
      expect(appData.salary).toBe('20 000 - 25 000 PLN');
      expect(appData.location).toBe('Warszawa / Hybrydowo');
      expect(appData.portal).toBe('NoFluffJobs');
      expect(appData.url).toBe(`https://nofluffjobs.com/job/senior-qa-automation-${testRunId}`);

      // Verify skills is properly parsed as an Array, not a raw JSON string
      expect(Array.isArray(appData.skills)).toBe(true);
      expect(appData.skills).toEqual(['TypeScript', 'Playwright', 'CI/CD']);
    });

    it('retrieves application directly via dbService to verify SQLite database state', async () => {
      const directRecord = await dbService.getApplicationById(testAppId);

      expect(directRecord).not.toBeNull();
      expect(directRecord?.id).toBe(testAppId);
      expect(directRecord?.status).toBe('Do zaaplikowania');
      expect(Array.isArray(directRecord?.skills)).toBe(true);
      expect(directRecord?.skills).toContain('Playwright');
      expect(directRecord?.skills).toContain('TypeScript');
    });
  });

  // Step 6: Updating application on duplicate resolution
  describe('Step 6: Duplicate Detection and Application Update', () => {
    const testAppId = `ext-e2e-${testRunId}`;

    it('detects saved application as duplicate upon re-visiting job', async () => {
      const res = await fetch(`${baseUrl}/api/applications`);
      const allApps = await res.json();

      const candidateJob = {
        url: `https://nofluffjobs.com/job/senior-qa-automation-${testRunId}`,
        company: `TechCorp Poland ${testRunId}`,
        role: 'Senior QA Automation Engineer',
      };

      const duplicate: any = findDuplicate(allApps, candidateJob);
      expect(duplicate).not.toBeNull();
      expect(duplicate?.id).toBe(testAppId);
    });

    it('updates application via PUT /api/applications/:id when duplicate is resolved by updating', async () => {
      const updateData = {
        role: 'Lead QA Automation Engineer',
        salary: '24 000 - 28 000 PLN',
        status: 'Do zaaplikowania' as const,
        notes: 'Zaktualizowano ofertę przez wtyczkę Chrome - zmieniono poziom na Lead i podniesiono widełki',
        skills: ['TypeScript', 'Playwright', 'CI/CD', 'Vitest'],
      };

      const updated: any = await updateApplication(baseUrl, testAppId, updateData);

      expect(updated).toBeDefined();
      expect(updated.id).toBe(testAppId);
      expect(updated.role).toBe('Lead QA Automation Engineer');
      expect(updated.salary).toBe('24 000 - 28 000 PLN');
      expect(updated.notes).toContain('zmieniono poziom na Lead');
      expect(updated.skills).toContain('Vitest');

      // Verify persistence via GET /api/applications/:id
      const verifyRes = await fetch(`${baseUrl}/api/applications/${testAppId}`);
      const verified = await verifyRes.json();
      expect(verified.role).toBe('Lead QA Automation Engineer');
      expect(verified.salary).toBe('24 000 - 28 000 PLN');
      expect(verified.skills).toEqual(['TypeScript', 'Playwright', 'CI/CD', 'Vitest']);
    });
  });

  // Step 7: Extension files and manifest integrity check
  describe('Step 7: Extension Asset Integrity & Security Constraints', () => {
    const extensionDir = path.resolve(__dirname, '..', 'extension');
    const manifestPath = path.join(extensionDir, 'manifest.json');

    it('verifies manifest.json exists, is valid JSON and has manifest_version 3', () => {
      expect(fs.existsSync(manifestPath)).toBe(true);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

      expect(manifest.manifest_version).toBe(3);
      expect(manifest.permissions).toContain('activeTab');
      expect(manifest.permissions).toContain('scripting');
      expect(manifest.permissions).toContain('storage');
      expect(manifest.host_permissions).toContain('http://*/*');
      expect(manifest.host_permissions).toContain('https://*/*');
      expect(manifest.action?.default_popup).toBe('popup.html');
      expect(manifest.commands?._execute_action?.suggested_key?.default).toBe('Alt+Shift+J');
    });

    it('verifies all icon files declared in manifest exist and have non-zero size', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      const sizes = ['16', '48', '128'];

      for (const size of sizes) {
        const iconRel = manifest.icons?.[size] || manifest.action?.default_icon?.[size];
        expect(iconRel, `Icon size ${size} must be declared in manifest`).toBeDefined();

        const iconPath = path.join(extensionDir, iconRel);
        expect(fs.existsSync(iconPath), `Icon file ${iconPath} must exist on disk`).toBe(true);
        expect(fs.statSync(iconPath).size).toBeGreaterThan(0);
      }
    });

    it('verifies core extension files exist and are non-empty', () => {
      const files = ['popup.html', 'popup.css', 'popup.js', 'extractor.js'];

      for (const file of files) {
        const filePath = path.join(extensionDir, file);
        expect(fs.existsSync(filePath), `Extension file ${file} must exist`).toBe(true);
        expect(fs.statSync(filePath).size, `Extension file ${file} must not be empty`).toBeGreaterThan(0);
      }
    });

    it('verifies zero eval(), zero new Function() and zero inline scripts', () => {
      const jsFiles = ['popup.js', 'extractor.js'];

      for (const jsFile of jsFiles) {
        const content = fs.readFileSync(path.join(extensionDir, jsFile), 'utf-8');
        expect(content.includes('eval('), `No eval() in ${jsFile}`).toBe(false);
        expect(content.includes('new Function('), `No new Function() in ${jsFile}`).toBe(false);
      }

      const htmlContent = fs.readFileSync(path.join(extensionDir, 'popup.html'), 'utf-8');
      // Verify no inline script tags containing code (only src="..." imports allowed)
      const inlineScriptMatches = htmlContent.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi);
      expect(inlineScriptMatches).toBeNull();
    });

    it('verifies extractor.js extracts job offer data from simulated DOM', () => {
      const mockDoc = {
        title: 'Senior Automation QA Engineer - TechCorp',
        querySelector: (selector: string) => {
          if (selector === '.job-description') {
            return {
              cloneNode: () => ({
                querySelectorAll: () => [],
                textContent: 'TechCorp poszukuje doświadczonego testera automatyzującego w Playwright.',
              }),
            };
          }
          if (selector === 'meta[property="og:title"]') {
            return { getAttribute: () => 'Senior Automation QA Engineer - TechCorp' };
          }
          if (selector === 'meta[name="description"]') {
            return { getAttribute: () => 'Oferta pracy na stanowisku Senior Automation QA' };
          }
          return null;
        },
      } as unknown as Document;

      const mockWin = {
        location: { href: 'https://nofluffjobs.com/job/senior-automation-qa' },
        getSelection: () => ({ toString: () => '' }),
      } as unknown as Window;

      const extracted = extractJobOfferData(mockDoc, mockWin);

      expect(extracted.url).toBe('https://nofluffjobs.com/job/senior-automation-qa');
      expect(extracted.title).toBe('Senior Automation QA Engineer - TechCorp');
      expect(extracted.metaDescription).toBe('Oferta pracy na stanowisku Senior Automation QA');
      expect(extracted.rawText).toContain('Playwright');
    });
  });
});
