import { useState, useEffect, useCallback, useRef, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { JobApplication } from '../types';
import { api } from '../services/api';

export const STORAGE_KEY = 'job_tracker_applications_v1';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface ApplicationSyncResult {
  applications: JobApplication[];
  setApplications: Dispatch<SetStateAction<JobApplication[]>>;
  applicationsRef: MutableRefObject<JobApplication[]>;
  isLoading: boolean;
  syncStatus: SyncStatus;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  notify: (msg: string) => void;
}

/**
 * Owns the applications collection state, its localStorage cache and the
 * bootstrap sync with the backend SQLite database (GET /api/applications).
 * Also exposes the shared notification and sync-status setters used by the
 * CRUD layer.
 */
export function useApplicationSync(onNotification?: (msg: string) => void): ApplicationSyncResult {
  const [applications, setApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading localStorage', e);
    }
    // No user data cached locally -> start empty and hydrate from the backend.
    // Seed/demo data is never shown or pushed unless the user explicitly resets to it.
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const isInitialSyncDone = useRef<boolean>(false);
  const applicationsRef = useRef<JobApplication[]>(applications);

  useEffect(() => {
    applicationsRef.current = applications;
  }, [applications]);

  const notify = useCallback(
    (msg: string) => {
      if (onNotification) onNotification(msg);
    },
    [onNotification]
  );

  // Sync with backend SQLite database on mount
  useEffect(() => {
    let isMounted = true;

    async function syncWithDatabase() {
      setSyncStatus('syncing');
      try {
        const serverApps = await api.getApplications();
        if (!isMounted) return;

        if (serverApps && serverApps.length > 0) {
          // Database has data -> use server data as source of truth
          applicationsRef.current = serverApps;
          setApplications(serverApps);
          setSyncStatus('idle');
        } else {
          // Database is empty -> bootstrap ONLY the entries the user actually has
          // in localStorage (their own data). Seed/demo data (INITIAL_JOB_APPLICATIONS)
          // is never pushed automatically; if localStorage is empty we push nothing
          // and simply show an empty state, so a fresh self-hosted database is never
          // silently populated with demo offers.
          const localSaved = localStorage.getItem(STORAGE_KEY);
          let toBootstrap: JobApplication[] = [];
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                toBootstrap = parsed;
              }
            } catch {
              // Malformed cache -> nothing to bootstrap, keep the empty state.
            }
          }

          if (toBootstrap.length > 0) {
            await api.batchCreateApplications(toBootstrap);
            if (isMounted) {
              applicationsRef.current = toBootstrap;
              setApplications(toBootstrap);
              notify(`Zsynchronizowano ${toBootstrap.length} ofert z bazą danych na serwerze!`);
              setSyncStatus('idle');
            }
          } else {
            if (isMounted) {
              applicationsRef.current = [];
              setApplications([]);
              setSyncStatus('idle');
            }
          }
        }
      } catch (err) {
        console.warn('Backend database sync unavailable, using local cache:', err);
        if (isMounted) {
          setSyncStatus('offline');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          isInitialSyncDone.current = true;
        }
      }
    }

    syncWithDatabase();

    return () => {
      isMounted = false;
    };
  }, [notify]);

  // Keep localStorage updated as backup cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [applications]);

  return {
    applications,
    setApplications,
    applicationsRef,
    isLoading,
    syncStatus,
    setSyncStatus,
    notify,
  };
}
