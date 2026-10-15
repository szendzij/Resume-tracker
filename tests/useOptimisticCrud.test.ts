import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useState, useRef, useEffect } from 'react';
import { useOptimisticCrud } from '../src/hooks/useOptimisticCrud';
import type { SyncStatus } from '../src/hooks/useApplicationSync';
import { api } from '../src/services/api';
import { JobApplication } from '../src/types';

vi.mock('../src/services/api', () => ({
  api: {
    getApplications: vi.fn(),
    createApplication: vi.fn(),
    batchCreateApplications: vi.fn(),
    updateApplication: vi.fn(),
    batchUpdateApplications: vi.fn(),
    deleteApplication: vi.fn(),
    batchDeleteApplications: vi.fn(),
    parseJob: vi.fn(),
  },
}));

const sampleApp1: JobApplication = {
  id: 'app-1',
  role: 'Frontend Engineer',
  company: 'Alpha Corp',
  portal: 'LinkedIn',
  url: 'https://alpha.example.com',
  appliedDate: '2026-10-01',
  status: 'Wysłana',
  skills: ['React', 'TypeScript'],
};

const sampleApp2: JobApplication = {
  id: 'app-2',
  role: 'Backend Engineer',
  company: 'Beta Corp',
  portal: 'NoFluffJobs',
  url: 'https://beta.example.com',
  appliedDate: '2026-10-02',
  status: 'Wysłana',
  skills: ['Node.js', 'Express'],
};

/**
 * Harness that mounts useOptimisticCrud on top of a real React state + ref,
 * exactly like useApplications wires it, so the rollback logic is exercised in
 * isolation from the server-sync layer.
 */
function useCrudHarness() {
  const [applications, setApplications] = useState<JobApplication[]>([sampleApp1, sampleApp2]);
  const applicationsRef = useRef<JobApplication[]>(applications);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  const crud = useOptimisticCrud({
    applications,
    setApplications,
    applicationsRef,
    setSyncStatus,
    notify,
  });

  return { applications, syncStatus, crud };
}

let notify = vi.fn((_msg: string): void => {});

describe('useOptimisticCrud hook (izolowany)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    notify = vi.fn((_msg: string): void => {});
    vi.mocked(api.updateApplication).mockImplementation(async (_id, updates) => ({
      ...sampleApp1,
      ...updates,
    }));
    vi.mocked(api.deleteApplication).mockResolvedValue({ success: true, id: 'app-1' });
    vi.mocked(api.createApplication).mockImplementation(async (app) => app);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('rollback: przy błędzie serwera updateStatus przywraca status i timeline do wartości oryginalnych', async () => {
    vi.mocked(api.updateApplication).mockRejectedValueOnce(new Error('Database lock'));

    const { result } = renderHook(() => useCrudHarness());
    const originalStatus = result.current.applications.find((a) => a.id === 'app-1')?.status;
    const originalTimeline = result.current.applications.find((a) => a.id === 'app-1')?.timeline;

    // Optimistic update happens synchronously, then the rejected sync rolls it back.
    await act(async () => {
      await result.current.crud.updateStatus('app-1', 'Rozmowa HR');
    });

    const rolledBack = result.current.applications.find((a) => a.id === 'app-1');
    expect(rolledBack?.status).toBe(originalStatus);
    expect(rolledBack?.status).toBe('Wysłana');
    expect(rolledBack?.timeline).toEqual(originalTimeline);
    expect(result.current.syncStatus).toBe('error');
    expect(notify).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
  });

  it('sukces: przy poprawnym API zaktualizowany status pozostaje i syncStatus wraca do idle', async () => {
    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.updateStatus('app-1', 'Rozmowa HR');
    });

    expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Rozmowa HR');
    expect(result.current.syncStatus).toBe('idle');
    expect(notify).toHaveBeenCalledWith('Zmieniono status na: Rozmowa HR');
  });

  it('rollback: przy błędzie serwera deleteApplication przywraca usuniętą aplikację', async () => {
    vi.mocked(api.deleteApplication).mockRejectedValueOnce(new Error('Delete DB failure'));

    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.deleteApplication('app-1', 'Alpha Corp');
    });

    await waitFor(() => {
      expect(result.current.applications.find((a) => a.id === 'app-1')).toBeDefined();
    });
    expect(result.current.applications).toHaveLength(2);
    expect(result.current.syncStatus).toBe('error');
    expect(notify).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
  });

  it('rollback: bulkUpdateStatus przywraca statusy wszystkich wybranych aplikacji po błędzie batchu', async () => {
    vi.mocked(api.batchUpdateApplications).mockRejectedValueOnce(new Error('Bulk DB failure'));

    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.bulkUpdateStatus(['app-1', 'app-2'], 'Odrzucona');
    });

    expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Wysłana');
    expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Wysłana');
    expect(result.current.syncStatus).toBe('error');
    expect(notify).toHaveBeenCalledWith('Zmieniono status dla 2 aplikacji na: Odrzucona');
    expect(notify).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
  });

  it('sukces: bulkUpdateStatus ustawia nowy status i wraca do idle', async () => {
    vi.mocked(api.batchUpdateApplications).mockResolvedValueOnce({ count: 2, success: true });

    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.bulkUpdateStatus(['app-1', 'app-2'], 'Odrzucona');
    });

    expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Odrzucona');
    expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Odrzucona');
    expect(result.current.syncStatus).toBe('idle');
  });

  it('rollback: saveApplication (nowa) usuwa nieudanie utworzoną aplikację', async () => {
    vi.mocked(api.createApplication).mockRejectedValueOnce(new Error('Create failure'));

    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.saveApplication({ company: 'Nowa Firma', role: 'QA Engineer' });
    });

    expect(result.current.applications).toHaveLength(2);
    expect(result.current.syncStatus).toBe('error');
    expect(notify).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
  });

  it('sukces: applyInboxStatusUpdates nakłada status i notatkę na wskazaną aplikację', async () => {
    vi.mocked(api.batchUpdateApplications).mockResolvedValueOnce({ count: 1, success: true });

    const { result } = renderHook(() => useCrudHarness());

    await act(async () => {
      await result.current.crud.applyInboxStatusUpdates([
        { appId: 'app-1', newStatus: 'Rozmowa HR', noteAddition: 'Zaproszenie na rozmowę' },
      ]);
    });

    const updated = result.current.applications.find((a) => a.id === 'app-1');
    expect(updated?.status).toBe('Rozmowa HR');
    expect(updated?.notes).toContain('Zaproszenie na rozmowę');
    expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Wysłana');
    expect(result.current.syncStatus).toBe('idle');
  });
});
