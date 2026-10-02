import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import { applicationsRouter } from './applications.routes';
import { dbService } from '../services/db.service';
import { JobApplication } from '../../src/types';

vi.mock('../services/db.service', () => ({
  dbService: {
    getAllApplications: vi.fn(),
    getApplicationById: vi.fn(),
    saveApplication: vi.fn(),
    saveApplicationsBatch: vi.fn(),
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

  it('POST / creates application and returns 201', async () => {
    vi.mocked(dbService.saveApplication).mockResolvedValue(mockApp);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockApp),
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.company).toBe('Acme Corp');
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

  it('DELETE /:id deletes an application', async () => {
    vi.mocked(dbService.deleteApplication).mockResolvedValue(true);

    const res = await fetch(`${baseUrl}/app-1`, {
      method: 'DELETE',
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
