import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useApplications } from '../src/hooks/useApplications';
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

const STORAGE_KEY = 'job_tracker_applications_v1';

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

describe('useApplications hook', () => {
  let notifySpy = vi.fn((_msg: string): void => {});

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    notifySpy = vi.fn((_msg: string): void => {});
    // Default: return sample apps from database
    vi.mocked(api.getApplications).mockResolvedValue([sampleApp1, sampleApp2]);
    vi.mocked(api.createApplication).mockImplementation(async (app) => app);
    vi.mocked(api.updateApplication).mockImplementation(async (_id, updates) => ({ ...sampleApp1, ...updates }));
    vi.mocked(api.batchUpdateApplications).mockResolvedValue({ count: 2, success: true });
    vi.mocked(api.deleteApplication).mockResolvedValue({ success: true, id: 'app-1' });
    vi.mocked(api.batchDeleteApplications).mockResolvedValue({ count: 2, success: true });
    vi.mocked(api.batchCreateApplications).mockResolvedValue({ count: 2, success: true });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('1. Inicjalizacja z bazy danych serwera', () => {
    it('inicjalizuje aplikacje danymi z API serwera i ustawia status idle', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.getApplications).toHaveBeenCalledTimes(1);
      expect(result.current.applications).toHaveLength(2);
      expect(result.current.applications[0].id).toBe('app-1');
      expect(result.current.applications[1].id).toBe('app-2');
      expect(result.current.syncStatus).toBe('idle');
    });
  });

  describe('2. Fallback do localStorage', () => {
    it('gdy baza serwera jest pusta, bootstrapuje dane z localStorage', async () => {
      const cachedApp: JobApplication = {
        ...sampleApp1,
        id: 'cached-1',
        company: 'Cached Corp',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([cachedApp]));
      vi.mocked(api.getApplications).mockResolvedValueOnce([]);

      const { result } = renderHook(() => useApplications(notifySpy));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(api.batchCreateApplications).toHaveBeenCalledWith([cachedApp]);
      expect(result.current.applications).toEqual([cachedApp]);
      expect(result.current.syncStatus).toBe('idle');
    });

    it('gdy serwer zwraca błąd, używa danych z pamięci podręcznej i ustawia syncStatus offline', async () => {
      const cachedApp: JobApplication = {
        ...sampleApp1,
        id: 'offline-cached-1',
        company: 'Offline Corp',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify([cachedApp]));
      vi.mocked(api.getApplications).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useApplications(notifySpy));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.applications).toEqual([cachedApp]);
      expect(result.current.syncStatus).toBe('offline');
    });
  });

  describe('3. Pomyślna zmiana statusu i synchronizacja (updateStatus)', () => {
    it('optymistycznie aktualizuje status, wywołuje api.updateApplication i ustawia syncStatus idle', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateStatus('app-1', 'Rozmowa HR');
      });

      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Rozmowa HR');
      expect(api.updateApplication).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({
          status: 'Rozmowa HR',
          lastUpdated: expect.any(String),
        })
      );
      expect(result.current.syncStatus).toBe('idle');
      expect(notifySpy).toHaveBeenCalledWith('Zmieniono status na: Rozmowa HR');
    });
  });

  describe('4. Rollback przy błędzie serwera w updateStatus', () => {
    it('wycofuje zmianę statusu, ustawia syncStatus error i powiadamia użytkownika gdy API zwróci błąd', async () => {
      vi.mocked(api.updateApplication).mockRejectedValueOnce(new Error('Database lock'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.updateStatus('app-1', 'Odrzucona');
      });

      // Status should be rolled back to initial 'Wysłana'
      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Wysłana');
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('5. Pomyślne dodanie/edycja i rollback w saveApplication', () => {
    it('pomyślnie dodaje nową aplikację i synchronizuje z serwerem', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveApplication({
          role: 'QA Architect',
          company: 'Gamma Corp',
          portal: 'LinkedIn',
          url: 'https://gamma.example.com',
        });
      });

      expect(result.current.applications).toHaveLength(3);
      expect(result.current.applications[0].company).toBe('Gamma Corp');
      expect(api.createApplication).toHaveBeenCalledWith(expect.objectContaining({ company: 'Gamma Corp' }));
      expect(result.current.syncStatus).toBe('idle');
      expect(notifySpy).toHaveBeenCalledWith('Dodano nową aplikację!');
    });

    it('wycofuje dodanie nowej aplikacji gdy serwer zgłosi błąd (rollback)', async () => {
      vi.mocked(api.createApplication).mockRejectedValueOnce(new Error('Server crash on create'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveApplication({
          role: 'QA Fail',
          company: 'Fail Corp',
        });
      });

      expect(result.current.applications).toHaveLength(2);
      expect(result.current.applications.some((a) => a.company === 'Fail Corp')).toBe(false);
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });

    it('pomyślnie aktualizuje istniejącą aplikację', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveApplication({ role: 'Lead Frontend' }, 'app-1');
      });

      expect(result.current.applications.find((a) => a.id === 'app-1')?.role).toBe('Lead Frontend');
      expect(api.updateApplication).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ role: 'Lead Frontend' })
      );
      expect(result.current.syncStatus).toBe('idle');
      expect(notifySpy).toHaveBeenCalledWith('Zaktualizowano aplikację.');
    });

    it('wycofuje edycję istniejącej aplikacji gdy serwer zgłosi błąd (rollback)', async () => {
      vi.mocked(api.updateApplication).mockRejectedValueOnce(new Error('Update failed'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.saveApplication({ role: 'Broken Role' }, 'app-1');
      });

      expect(result.current.applications.find((a) => a.id === 'app-1')?.role).toBe('Frontend Engineer');
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('6. Pomyślne usunięcie i rollback w deleteApplication', () => {
    it('pomyślnie usuwa aplikację z listy i bazy serwera', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteApplication('app-1', 'Alpha Corp');
      });

      expect(result.current.applications).toHaveLength(1);
      expect(result.current.applications.find((a) => a.id === 'app-1')).toBeUndefined();
      expect(api.deleteApplication).toHaveBeenCalledWith('app-1');
      expect(result.current.syncStatus).toBe('idle');
    });

    it('przywraca usuniętą aplikację gdy serwer zgłosi błąd (rollback)', async () => {
      vi.mocked(api.deleteApplication).mockRejectedValueOnce(new Error('Delete DB failure'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.deleteApplication('app-1', 'Alpha Corp');
      });

      expect(result.current.applications).toHaveLength(2);
      expect(result.current.applications.find((a) => a.id === 'app-1')).toBeDefined();
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('7. Masowa zmiana statusu (bulkUpdateStatus) z atomowym API i rollbackiem', () => {
    it('wykonuje atomowe api.batchUpdateApplications i aktualizuje wszystkie zaznaczone aplikacje', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkUpdateStatus(['app-1', 'app-2'], 'Rozmowa techniczna');
      });

      expect(api.batchUpdateApplications).toHaveBeenCalledTimes(1);
      expect(api.batchUpdateApplications).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'app-1', status: 'Rozmowa techniczna' }),
        expect.objectContaining({ id: 'app-2', status: 'Rozmowa techniczna' }),
      ]);
      expect(result.current.applications[0].status).toBe('Rozmowa techniczna');
      expect(result.current.applications[1].status).toBe('Rozmowa techniczna');
      expect(result.current.syncStatus).toBe('idle');
    });

    it('cofa masową zmianę statusów gdy API batch zwróci błąd (rollback)', async () => {
      vi.mocked(api.batchUpdateApplications).mockRejectedValueOnce(new Error('Transaction aborted'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkUpdateStatus(['app-1', 'app-2'], 'Oferta');
      });

      expect(result.current.applications[0].status).toBe('Wysłana');
      expect(result.current.applications[1].status).toBe('Wysłana');
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('8. Masowa zmiana daty (bulkUpdateDate) z atomowym API i rollbackiem', () => {
    it('wykonuje pojedyncze wywołanie api.batchUpdateApplications dla wielu aplikacji', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkUpdateDate(['app-1', 'app-2'], '2026-10-15');
      });

      expect(api.batchUpdateApplications).toHaveBeenCalledTimes(1);
      expect(api.batchUpdateApplications).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'app-1', appliedDate: '2026-10-15' }),
        expect.objectContaining({ id: 'app-2', appliedDate: '2026-10-15' }),
      ]);
      expect(result.current.applications[0].appliedDate).toBe('2026-10-15');
      expect(result.current.applications[1].appliedDate).toBe('2026-10-15');
      expect(result.current.syncStatus).toBe('idle');
    });

    it('przywraca poprzednie daty przy awarii serwera (rollback)', async () => {
      vi.mocked(api.batchUpdateApplications).mockRejectedValueOnce(new Error('Batch date failure'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkUpdateDate(['app-1', 'app-2'], '2026-11-01');
      });

      expect(result.current.applications[0].appliedDate).toBe('2026-10-01');
      expect(result.current.applications[1].appliedDate).toBe('2026-10-02');
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('9. Masowe usuwanie (bulkDelete) z rollbackiem', () => {
    it('pomyślnie usuwa zaznaczone aplikacje za pomocą api.batchDeleteApplications', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkDelete(['app-1', 'app-2']);
      });

      expect(result.current.applications).toHaveLength(0);
      expect(api.batchDeleteApplications).toHaveBeenCalledWith(['app-1', 'app-2']);
      expect(result.current.syncStatus).toBe('idle');
    });

    it('przywraca usunięte aplikacje gdy serwer rzuci błąd (rollback)', async () => {
      vi.mocked(api.batchDeleteApplications).mockRejectedValueOnce(new Error('Bulk delete failed'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.bulkDelete(['app-1', 'app-2']);
      });

      expect(result.current.applications).toHaveLength(2);
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });

  describe('10. Odporność na Race Condition przy współbieżnych operacjach i selektywny rollback', () => {
    it('selektywny rollback: gdy żądanie A (app-1) kończy się błędem, a w międzyczasie żądanie B (app-2) zmieniło status, rollback cofa TYLKO app-1, a app-2 zachowuje swój status', async () => {
      let rejectApp1!: (err: Error) => void;
      const app1Promise = new Promise((_, reject) => {
        rejectApp1 = reject;
      });

      vi.mocked(api.updateApplication).mockImplementation(async (id, updates) => {
        if (id === 'app-1') {
          return app1Promise as any;
        }
        return { ...sampleApp2, ...updates };
      });

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Akcja A (zmiana statusu app-1) - żądanie w toku
      let actionAPromise!: Promise<void>;
      act(() => {
        actionAPromise = result.current.updateStatus('app-1', 'Rozmowa HR');
      });

      // Optymistycznie app-1 ma 'Rozmowa HR'
      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Rozmowa HR');

      // Akcja B (zmiana statusu app-2 na 'Oferta') - następuje podczas oczekiwania na akcję A i kończy się sukcesem
      await act(async () => {
        await result.current.updateStatus('app-2', 'Oferta');
      });

      // App-2 ma nowy status 'Oferta'
      expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Oferta');

      // Teraz akcja A zwraca błąd z serwera
      await act(async () => {
        rejectApp1(new Error('Serwer odrzucił aktualizację app-1'));
        try {
          await actionAPromise;
        } catch {
          // Obsłużone wewnątrz hooka
        }
      });

      // Upewnij się, że rollback wycofuje TYLKO app1, a app2 ZACHOWUJE swój zaktualizowany status!
      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Wysłana');
      expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Oferta');
      expect(result.current.syncStatus).toBe('error');
    });
  });

  describe('11. Czystość i synchronizacja applyInboxStatusUpdates', () => {
    it('aktualizuje stan czystą funkcją i asynchronicznie wywołuje api.batchUpdateApplications', async () => {
      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.applyInboxStatusUpdates([
          {
            appId: 'app-1',
            newStatus: 'Rozmowa techniczna',
            noteAddition: 'Zaproszenie na call z leadem',
            meetingDate: '2026-10-12',
          },
        ]);
      });

      expect(api.batchUpdateApplications).toHaveBeenCalledTimes(1);
      expect(api.batchUpdateApplications).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'app-1',
          status: 'Rozmowa techniczna',
        }),
      ]);
      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Rozmowa techniczna');
      expect(result.current.applications.find((a) => a.id === 'app-1')?.notes).toContain('Zaproszenie na call z leadem');
      expect(result.current.syncStatus).toBe('idle');
    });

    it('wycofuje zmiany wyłącznie dla zaktualizowanych aplikacji w razie błędu serwera', async () => {
      vi.mocked(api.batchUpdateApplications).mockRejectedValueOnce(new Error('Inbox batch sync failed'));

      const { result } = renderHook(() => useApplications(notifySpy));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.applyInboxStatusUpdates([
          {
            appId: 'app-1',
            newStatus: 'Odrzucona',
            noteAddition: 'Podziękowanie za udział',
          },
        ]);
      });

      expect(result.current.applications.find((a) => a.id === 'app-1')?.status).toBe('Wysłana');
      expect(result.current.applications.find((a) => a.id === 'app-2')?.status).toBe('Wysłana');
      expect(result.current.syncStatus).toBe('error');
      expect(notifySpy).toHaveBeenCalledWith('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
    });
  });
});
