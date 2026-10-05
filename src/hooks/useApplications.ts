import { useState, useEffect, useCallback, useRef } from 'react';
import { JobApplication, JobStatus, ApplicationTimelineEntry } from '../types';
import { INITIAL_JOB_APPLICATIONS } from '../data/initialJobs';
import { api } from '../services/api';
import { detectDuplicate } from '../utils/duplicateDetector';
import { appendTimelineTransition, createInitialTimelineEntry } from '../utils/timelineUtils';

const STORAGE_KEY = 'job_tracker_applications_v1';

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export function useApplications(onNotification?: (msg: string) => void) {
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
    return INITIAL_JOB_APPLICATIONS;
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
          // Database is empty -> bootstrap from localStorage or initial list
          const localSaved = localStorage.getItem(STORAGE_KEY);
          let toBootstrap = INITIAL_JOB_APPLICATIONS;
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                toBootstrap = parsed;
              }
            } catch {
              // fallback to initial
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
            setSyncStatus('idle');
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

  // Status change for single application with optimistic update and rollback
  const updateStatus = useCallback(
    async (id: string, newStatus: JobStatus, customDate?: string) => {
      const targetApp = applicationsRef.current.find((a) => a.id === id);
      if (!targetApp) return;

      const originalStatus = targetApp.status;
      const originalTimeline = targetApp.timeline;
      const originalLastUpdated = targetApp.lastUpdated;

      const now = new Date().toISOString();
      const today = customDate || now.split('T')[0];
      const newTimeline = appendTimelineTransition(
        targetApp.timeline,
        newStatus,
        today,
        undefined,
        targetApp.id,
        targetApp.appliedDate,
        targetApp.status
      );

      const updatePayload = {
        status: newStatus,
        timeline: newTimeline,
        lastUpdated: now,
      };

      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, ...updatePayload } : app))
      );
      notify(`Zmieniono status na: ${newStatus}`);

      setSyncStatus('syncing');
      try {
        await api.updateApplication(id, updatePayload);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync status update to server', err);
        setApplications((prev) =>
          prev.map((app) =>
            app.id === id
              ? {
                  ...app,
                  status: originalStatus,
                  timeline: originalTimeline,
                  lastUpdated: originalLastUpdated,
                }
              : app
          )
        );
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );



  // Save or update an application
  const saveApplication = useCallback(
    async (data: Partial<JobApplication>, existingId?: string) => {
      const now = new Date().toISOString();
      const today = now.split('T')[0];

      if (existingId) {
        const targetApp = applicationsRef.current.find((a) => a.id === existingId);
        if (!targetApp) return;

        const originalApp = { ...targetApp };

        let updatedTimeline = data.timeline ?? targetApp.timeline;
        if (!data.timeline && data.status && data.status !== targetApp.status) {
          updatedTimeline = appendTimelineTransition(
            targetApp.timeline,
            data.status,
            today,
            undefined,
            targetApp.id,
            targetApp.appliedDate,
            targetApp.status
          );
        }

        const updatePayload: Partial<JobApplication> = {
          ...data,
          timeline: updatedTimeline,
          lastUpdated: now,
        };

        setApplications((prev) =>
          prev.map((app) =>
            app.id === existingId ? { ...app, ...updatePayload } : app
          )
        );
        notify('Zaktualizowano aplikację.');

        setSyncStatus('syncing');
        try {
          await api.updateApplication(existingId, updatePayload);
          setSyncStatus('idle');
        } catch (err) {
          console.error('Failed to sync application update to server', err);
          setApplications((prev) =>
            prev.map((app) => (app.id === existingId ? originalApp : app))
          );
          setSyncStatus('error');
          notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
        }
      } else {
        const newAppDate = data.appliedDate || today;
        const newAppId = `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newApp: JobApplication = {
          id: newAppId,
          role: data.role || 'Stanowisko',
          company: data.company || 'Firma',
          portal: data.portal || 'LinkedIn',
          url: data.url || '',
          appliedDate: newAppDate,
          status: data.status || 'Wysłana',
          location: data.location,
          salary: data.salary,
          skills: data.skills || [],
          timeline:
            data.timeline && data.timeline.length > 0
              ? data.timeline
              : [createInitialTimelineEntry(newAppId, data.status || 'Wysłana', newAppDate)],
          notes: data.notes,
          lastUpdated: now,
        };

        setApplications((prev) => [newApp, ...prev]);
        notify('Dodano nową aplikację!');

        setSyncStatus('syncing');
        try {
          await api.createApplication(newApp);
          setSyncStatus('idle');
        } catch (err) {
          console.error('Failed to sync new application to server', err);
          setApplications((prev) => prev.filter((app) => app.id !== newApp.id));
          setSyncStatus('error');
          notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
        }
      }
    },
    [notify]
  );

  // Delete an application
  const deleteApplication = useCallback(
    async (id: string, companyName?: string) => {
      const targetApp = applicationsRef.current.find((a) => a.id === id);
      if (!targetApp) return;

      setApplications((prev) => prev.filter((a) => a.id !== id));
      notify(`Usunięto aplikację${companyName ? ` do firmy ${companyName}` : ''}.`);

      setSyncStatus('syncing');
      try {
        await api.deleteApplication(id);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync deletion to server', err);
        setApplications((prev) =>
          prev.some((a) => a.id === targetApp.id) ? prev : [targetApp, ...prev]
        );
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );



  // Add multiple applications (from batch import)
  const addBatchApplications = useCallback(
    async (newApps: JobApplication[], duplicateCount: number) => {
      if (!newApps || newApps.length === 0) return;
      const addedIds = new Set(newApps.map((a) => a.id));

      setApplications((prev) => [...newApps, ...prev]);

      if (duplicateCount > 0) {
        notify(`Pomyślnie dodano ${newApps.length} ofert (pominięto ${duplicateCount} duplikatów).`);
      } else {
        notify(`Pomyślnie zaimportowano ${newApps.length} nowych ofert!`);
      }

      setSyncStatus('syncing');
      try {
        await api.batchCreateApplications(newApps);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync batch import to server', err);
        setApplications((prev) => prev.filter((app) => !addedIds.has(app.id)));
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );

  // Apply status updates from inbox sync
  const applyInboxStatusUpdates = useCallback(
    async (
      updates: Array<{
        appId: string;
        newStatus: JobStatus;
        noteAddition: string;
        meetingDate?: string;
      }>
    ) => {
      if (!updates || updates.length === 0) return;
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const updatesMap = new Map(updates.map((u) => [u.appId, u]));
      const originalAppsMap = new Map<string, JobApplication>();

      const apiPayloads: Array<{
        id: string;
        status: JobStatus;
        timeline: ApplicationTimelineEntry[];
        notes?: string;
        lastUpdated: string;
      }> = [];

      for (const app of applicationsRef.current) {
        const update = updatesMap.get(app.id);
        if (!update) continue;

        originalAppsMap.set(app.id, { ...app });

        const updatedNotes = app.notes
          ? `${app.notes}\n${update.noteAddition}`
          : update.noteAddition;

        const updatedTimeline = appendTimelineTransition(
          app.timeline,
          update.newStatus,
          update.meetingDate || today,
          update.noteAddition || undefined,
          app.id,
          app.appliedDate,
          app.status
        );

        apiPayloads.push({
          id: app.id,
          status: update.newStatus,
          timeline: updatedTimeline,
          notes: updatedNotes,
          lastUpdated: now,
        });
      }

      if (apiPayloads.length === 0) return;

      const payloadMap = new Map(apiPayloads.map((p) => [p.id, p]));

      setApplications((prev) =>
        prev.map((app) => {
          const item = payloadMap.get(app.id);
          return item ? { ...app, ...item } : app;
        })
      );

      setSyncStatus('syncing');
      try {
        await api.batchUpdateApplications(apiPayloads);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync inbox updates to server', err);
        setApplications((prev) =>
          prev.map((app) => originalAppsMap.get(app.id) || app)
        );
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );

  // Add newly discovered app from inbox sync
  const addNewDiscoveredApp = useCallback(
    async (newApp: Partial<JobApplication>) => {
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const createdStatus = newApp.status || 'Weryfikacja CV';
      const createdDate = newApp.appliedDate || today;

      const created: JobApplication = {
        id: `job-email-${Date.now()}`,
        role: newApp.role || 'Stanowisko',
        company: newApp.company || 'Nowa firma',
        portal: newApp.portal || 'E-mail',
        url: newApp.url || '',
        appliedDate: createdDate,
        status: createdStatus,
        location: newApp.location || 'Polska / Remote',
        salary: newApp.salary || '',
        skills: newApp.skills || [],
        timeline: [createInitialTimelineEntry(`email-${Date.now()}`, createdStatus, createdDate)],
        notes: newApp.notes || 'Wykryto automatycznie z korespondencji e-mail.',
        lastUpdated: now,
      };

      const dupCheck = detectDuplicate(created, applicationsRef.current);
      if (dupCheck.isDuplicate) {
        notify(`Pominięto duplikat z poczty: ${dupCheck.reason || created.company}`);
        return;
      }

      setApplications((prev) => [created, ...prev]);
      notify(`Dodano ofertę wykrytą z poczty: ${created.company}`);

      setSyncStatus('syncing');
      try {
        await api.createApplication(created);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync discovered email app to server', err);
        setApplications((prev) => prev.filter((app) => app.id !== created.id));
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );

  // Bulk status update with atomic batchUpdateApplications and rollback
  const bulkUpdateStatus = useCallback(
    async (selectedIds: string[], newStatus: JobStatus) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const now = new Date().toISOString();
      const today = now.split('T')[0];
      const selectedSet = new Set(selectedIds);

      const originalMap = new Map<
        string,
        { status: JobStatus; timeline?: ApplicationTimelineEntry[]; lastUpdated?: string }
      >();

      const updatesPayload: Array<{
        id: string;
        status: JobStatus;
        timeline: ApplicationTimelineEntry[];
        lastUpdated: string;
      }> = [];

      for (const app of applicationsRef.current) {
        if (!selectedSet.has(app.id)) continue;
        originalMap.set(app.id, {
          status: app.status,
          timeline: app.timeline,
          lastUpdated: app.lastUpdated,
        });

        const updatedTimeline = appendTimelineTransition(
          app.timeline,
          newStatus,
          today,
          undefined,
          app.id,
          app.appliedDate,
          app.status
        );

        updatesPayload.push({
          id: app.id,
          status: newStatus,
          timeline: updatedTimeline,
          lastUpdated: now,
        });
      }

      const updatesMap = new Map(updatesPayload.map((u) => [u.id, u]));

      setApplications((prev) =>
        prev.map((app) => {
          const item = updatesMap.get(app.id);
          return item ? { ...app, ...item } : app;
        })
      );

      notify(`Zmieniono status dla ${count} aplikacji na: ${newStatus}`);

      setSyncStatus('syncing');
      try {
        await api.batchUpdateApplications(updatesPayload);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync bulk status update to server', err);
        setApplications((prev) =>
          prev.map((app) => {
            const orig = originalMap.get(app.id);
            return orig
              ? {
                  ...app,
                  status: orig.status,
                  timeline: orig.timeline,
                  lastUpdated: orig.lastUpdated,
                }
              : app;
          })
        );
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );

  // Bulk date update with atomic batchUpdateApplications and rollback
  const bulkUpdateDate = useCallback(
    async (selectedIds: string[], newDate: string) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const now = new Date().toISOString();
      const selectedSet = new Set(selectedIds);

      const originalMap = new Map<
        string,
        { appliedDate: string; lastUpdated?: string }
      >();

      const updatesPayload: Array<{ id: string; appliedDate: string; lastUpdated: string }> = [];

      for (const app of applicationsRef.current) {
        if (!selectedSet.has(app.id)) continue;
        originalMap.set(app.id, {
          appliedDate: app.appliedDate,
          lastUpdated: app.lastUpdated,
        });
        updatesPayload.push({
          id: app.id,
          appliedDate: newDate,
          lastUpdated: now,
        });
      }

      const updatesMap = new Map(updatesPayload.map((u) => [u.id, u]));

      setApplications((prev) =>
        prev.map((app) => {
          const item = updatesMap.get(app.id);
          return item ? { ...app, ...item } : app;
        })
      );

      notify(`Zaktualizowano datę wysłania dla ${count} aplikacji na: ${newDate}`);

      setSyncStatus('syncing');
      try {
        await api.batchUpdateApplications(updatesPayload);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync bulk date update to server', err);
        setApplications((prev) =>
          prev.map((app) => {
            const orig = originalMap.get(app.id);
            return orig
              ? {
                  ...app,
                  appliedDate: orig.appliedDate,
                  lastUpdated: orig.lastUpdated,
                }
              : app;
          })
        );
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );

  // Bulk delete with atomic batchDeleteApplications and rollback
  const bulkDelete = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const selectedSet = new Set(selectedIds);
      const toDeleteApps = applicationsRef.current.filter((app) => selectedSet.has(app.id));

      setApplications((prev) => prev.filter((app) => !selectedSet.has(app.id)));
      notify(`Trwale usunięto ${count} zaznaczonych aplikacji.`);

      setSyncStatus('syncing');
      try {
        await api.batchDeleteApplications(selectedIds);
        setSyncStatus('idle');
      } catch (err) {
        console.error('Failed to sync bulk delete to server', err);
        setApplications((prev) => {
          const currentIds = new Set(prev.map((a) => a.id));
          const restored = toDeleteApps.filter((a) => !currentIds.has(a.id));
          return [...restored, ...prev];
        });
        setSyncStatus('error');
        notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
      }
    },
    [notify]
  );



  // Reset to initial 25 QA jobs
  const resetToInitial = useCallback(async () => {
    if (
      window.confirm(
        'Czy na pewno chcesz przywrócić początkowy zestaw 25 ofert QA z linkami? Wprowadzone zmiany zostaną zastąpione danymi startowymi.'
      )
    ) {
      setApplications(INITIAL_JOB_APPLICATIONS);
      try {
        const current = await api.getApplications();
        if (current && current.length > 0) {
          await api.batchDeleteApplications(current.map((c) => c.id));
        }
        await api.batchCreateApplications(INITIAL_JOB_APPLICATIONS);
      } catch (err) {
        console.error('Failed to sync reset to server', err);
      }
      notify('Przywrócono początkową bazę 25 ofert.');
      return true;
    }
    return false;
  }, [notify]);

  // Re-analyze single job via AI API
  const reAnalyzeWithAi = useCallback(
    async (app: JobApplication) => {
      if (!app.url) {
        notify('Ta oferta nie posiada linku URL do ponownej analizy.');
        return;
      }

      notify('Analizuję ofertę przez model AI...');

      try {
        const data = await api.parseJob({ url: app.url });
        const now = new Date().toISOString();

        const currentTarget = applicationsRef.current.find((a) => a.id === app.id) || app;
        const originalApp = { ...currentTarget };

        const updatedSkills =
          data.skills && Array.isArray(data.skills) && data.skills.length > 0
            ? Array.from(new Set([...(currentTarget.skills || []), ...data.skills]))
            : currentTarget.skills;

        const updatedNotes = data.notes
          ? currentTarget.notes
            ? `${currentTarget.notes}\n[AI]: ${data.notes}`
            : `[AI]: ${data.notes}`
          : currentTarget.notes;

        const updates: Partial<JobApplication> = {
          role: data.role || currentTarget.role,
          company: data.company || currentTarget.company,
          portal: data.portal || currentTarget.portal,
          location: data.location || currentTarget.location,
          salary: data.salary || currentTarget.salary,
          skills: updatedSkills,
          notes: updatedNotes,
          lastUpdated: now,
        };

        setApplications((prev) =>
          prev.map((item) => (item.id === app.id ? { ...item, ...updates } : item))
        );

        setSyncStatus('syncing');
        try {
          await api.updateApplication(app.id, updates);
          setSyncStatus('idle');
          notify(
            `Zaktualizowano dane oferty: ${data.company || currentTarget.company} - ${data.role || currentTarget.role}`
          );
        } catch (syncErr) {
          console.error('Failed to sync AI analysis update to server', syncErr);
          setApplications((prev) =>
            prev.map((item) => (item.id === app.id ? originalApp : item))
          );
          setSyncStatus('error');
          notify('Błąd zapisu na serwerze - przywrócono poprzedni stan.');
        }
      } catch (e) {
        console.error(e);
        notify('Nie udało się przeanalizować linku przez AI.');
      }
    },
    [notify]
  );

  // Import full JSON backup (merge or overwrite)
  const importApplicationsFromJson = useCallback(
    async (importedApps: JobApplication[], mode: 'merge' | 'overwrite' = 'merge') => {
      if (!Array.isArray(importedApps) || importedApps.length === 0) {
        notify('Przesłany plik nie zawiera poprawnych aplikacji.');
        return;
      }

      if (mode === 'overwrite') {
        setApplications(importedApps);
        try {
          const current = await api.getApplications();
          if (current.length > 0) {
            await api.batchDeleteApplications(current.map((c) => c.id));
          }
          await api.batchCreateApplications(importedApps);
        } catch (err) {
          console.error('Failed to sync overwrite import to server', err);
        }
        notify(`Zastąpiono całą bazę danymi z kopii zapasowej (${importedApps.length} ofert).`);
      } else {
        const uniqueNew: JobApplication[] = [];
        let duplicateCount = 0;

        importedApps.forEach((item) => {
          const existingCheck = detectDuplicate(item, applications);
          const intraCheck = !existingCheck.isDuplicate
            ? detectDuplicate(item, uniqueNew, { isBatchCheck: true })
            : existingCheck;

          if (existingCheck.isDuplicate || intraCheck.isDuplicate) {
            duplicateCount++;
          } else {
            uniqueNew.push({
              ...item,
              id: item.id || `job-json-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            });
          }
        });

        setApplications((prev) => [...uniqueNew, ...prev]);
        if (uniqueNew.length > 0) {
          api.batchCreateApplications(uniqueNew).catch((err) => {
            console.error('Failed to sync JSON merge import to server', err);
          });
        }

        if (duplicateCount > 0) {
          notify(`Pomyślnie scalono ${uniqueNew.length} ofert (pominięto ${duplicateCount} duplikatów).`);
        } else {
          notify(`Pomyślnie zaimportowano ${uniqueNew.length} ofert z kopii zapasowej.`);
        }
      }
    },
    [applications, notify]
  );

  return {
    applications,
    isLoading,
    syncStatus,
    setApplications,
    setSyncStatus,
    updateStatus,
    saveApplication,
    deleteApplication,
    addBatchApplications,
    importApplicationsFromJson,
    applyInboxStatusUpdates,
    addNewDiscoveredApp,
    bulkUpdateStatus,
    bulkUpdateDate,
    bulkDelete,
    resetToInitial,
    reAnalyzeWithAi,
  };
}
