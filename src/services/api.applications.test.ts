import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';
import { JobApplication } from '../types';

describe('api.applications', () => {
  const mockFetch = vi.fn();
  (global as any).fetch = mockFetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleApp: JobApplication = {
    id: 'app-123',
    role: 'Fullstack Dev',
    company: 'TechCorp',
    portal: 'LinkedIn',
    url: 'https://example.com/job',
    appliedDate: '2026-10-02',
    status: 'Wysłana',
    skills: ['Node.js', 'React'],
  };

  it('getApplications calls GET /api/applications', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [sampleApp],
    });

    const result = await api.getApplications();
    expect(mockFetch).toHaveBeenCalledWith('/api/applications', expect.objectContaining({ method: 'GET' }));
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('app-123');
  });

  it('createApplication calls POST /api/applications', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sampleApp,
    });

    const result = await api.createApplication(sampleApp);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(sampleApp),
      })
    );
    expect(result.id).toBe('app-123');
  });

  it('batchCreateApplications calls POST /api/applications/batch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ count: 1, success: true }),
    });

    const result = await api.batchCreateApplications([sampleApp]);
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/applications/batch',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ applications: [sampleApp] }),
      })
    );
    expect(result.count).toBe(1);
  });

  it('deleteApplication calls DELETE /api/applications/:id', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, id: 'app-123' }),
    });

    const result = await api.deleteApplication('app-123');
    expect(mockFetch).toHaveBeenCalledWith('/api/applications/app-123', expect.objectContaining({ method: 'DELETE' }));
    expect(result.success).toBe(true);
  });
});
