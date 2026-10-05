import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import { applicationsRouter } from './applications.routes';
import { dbService } from '../services/db.service';
import { JobApplication } from '../../shared/types';

vi.mock('../services/db.service', () => ({
  dbService: {
    getAllApplications: vi.fn(),
    getApplicationById: vi.fn(),
    saveApplication: vi.fn(),
    saveApplicationsBatch: vi.fn(),
    updateApplicationsBatch: vi.fn(),
    deleteApplication: vi.fn(),
    deleteApplicationsBatch: vi.fn(),
  },
}));

describe('applicationsRouter', () => {
  let app: express.Express;
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/applications', applicationsRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api/applications`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  const mockApp: JobApplication = {
    id: 'app-1',
    role: 'Frontend Dev',
    company: 'Acme Corp',
    portal: 'LinkedIn',
    url: 'https://example.com',
    appliedDate: '2026-10-02',
    status: 'Wysłana',
    skills: ['React'],
  };

  it('GET / returns list of applications', async () => {
    vi.mocked(dbService.getAllApplications).mockResolvedValue([mockApp]);

    const res = await fetch(baseUrl);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].company).toBe('Acme Corp');
  });

  it('POST / creates application and returns 201 with crypto UUID when id not provided', async () => {
    vi.mocked(dbService.saveApplication).mockImplementation(async (app) => app);

    const newAppPayload = {
      role: 'Fullstack Dev',
      company: 'SecurityCorp',
      unknownField: 'should-be-stripped',
      isAdmin: true,
    };

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAppPayload),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.company).toBe('SecurityCorp');
    // Verify standard UUID format
    expect(data.id).toMatch(/^job-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    // Verify unknown fields are stripped by Zod (no passthrough)
    expect((data as any).unknownField).toBeUndefined();
    expect((data as any).isAdmin).toBeUndefined();
  });

  it('GET / does not leak error details when database fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(dbService.getAllApplications).mockRejectedValueOnce(new Error('Sensitive internal DB stack trace'));

    const res = await fetch(baseUrl);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Nie udało się pobrać aplikacji z bazy danych');
    expect(data.details).toBeUndefined();

    consoleErrorSpy.mockRestore();
  });

  it('POST /batch saves multiple applications', async () => {
    vi.mocked(dbService.saveApplicationsBatch).mockResolvedValue({ count: 2 });

    const res = await fetch(`${baseUrl}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applications: [mockApp, { ...mockApp, id: 'app-2' }] }),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.count).toBe(2);
    expect(data.success).toBe(true);
  });

  it('PUT /batch updates multiple applications and returns 200', async () => {
    vi.mocked(dbService.updateApplicationsBatch).mockResolvedValue(2);

    const updates = [
      { id: 'app-1', status: 'Rozmowa techniczna' },
      { id: 'app-2', status: 'Odrzucona' },
    ];

    const res = await fetch(`${baseUrl}/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(2);
    expect(data.success).toBe(true);
    expect(dbService.updateApplicationsBatch).toHaveBeenCalledWith(updates);
  });

  it('PUT /batch supports object payload with { updates: [...] }', async () => {
    vi.mocked(dbService.updateApplicationsBatch).mockResolvedValue(1);

    const updates = [{ id: 'app-1', status: 'Oferta' }];

    const res = await fetch(`${baseUrl}/batch`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.count).toBe(1);
    expect(data.success).toBe(true);
    expect(dbService.updateApplicationsBatch).toHaveBeenCalledWith(updates);
  });

  it('DELETE /:id deletes an application', async () => {
    vi.mocked(dbService.deleteApplication).mockResolvedValue(true);

    const res = await fetch(`${baseUrl}/app-1`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  describe('Zod input validation', () => {
    it('POST / rejects payload missing role', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: 'Acme Corp' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
      expect(data.details.some((d: string) => d.includes('role'))).toBe(true);
    });

    it('POST / rejects payload missing company', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'Frontend Dev' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
      expect(data.details.some((d: string) => d.includes('company'))).toBe(true);
    });

    it('POST / rejects payload with empty string for role or company', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: '   ', company: 'Acme Corp' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('POST / rejects payload with invalid data types', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 12345,
          company: 'Acme Corp',
          skills: 'not-an-array',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
      expect(data.details.length).toBeGreaterThan(0);
    });

    it('PUT /:id rejects update with empty or invalid types', async () => {
      const res = await fetch(`${baseUrl}/app-1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: '',
          skills: 'invalid-type-string',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('POST /batch rejects payload where applications is not an array', async () => {
      const res = await fetch(`${baseUrl}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applications: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('DELETE / rejects bulk delete payload where ids is not an array', async () => {
      const res = await fetch(baseUrl, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: 'invalid-string' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('PUT /batch rejects update item missing id', async () => {
      const res = await fetch(`${baseUrl}/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ status: 'Rozmowa HR' }]),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('PUT /batch rejects payload where updates is neither array nor object with updates array', async () => {
      const res = await fetch(`${baseUrl}/batch`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: 'not-an-array' }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('POST / rejects payload with invalid status not in ALL_STATUSES', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Backend Dev',
          company: 'Acme Corp',
          status: 'NiepoprawnyStatus123',
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });

    it('POST / rejects timeline entry missing date or with invalid status', async () => {
      const res = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'Backend Dev',
          company: 'Acme Corp',
          timeline: [
            {
              status: 'NieznanyStatus',
              date: '',
            },
          ],
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe('Nieprawidłowe dane wejściowe');
    });
  });
});

