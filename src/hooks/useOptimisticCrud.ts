import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from 'react';
import { JobApplication, JobStatus, ApplicationTimelineEntry } from '../types';
import { INITIAL_JOB_APPLICATIONS } from '../data/initialJobs';
import { api } from '../services/api';
import { detectDuplicate } from '../utils/duplicateDetector';
import { appendTimelineTransition, createInitialTimelineEntry } from '../utils/timelineUtils';
import type { SyncStatus } from './useApplicationSync';
import { runOptimisticMutation, type OptimisticMutation } from './useOptimisticMutation';

/** Appends a status transition to an application, supplying the standard fallbacks. */
function appendStatusTransition(
  app: JobApplication,
  newStatus: JobStatus,
  date: string,
  notes?: string
): ApplicationTimelineEntry[] {
  return appendTimelineTransition(app.timeline, newStatus, date, notes, app.id, app.appliedDate, app.status);
}

export interface OptimisticCrudContext {
  applications: JobApplication[];
  setApplications: Dispatch<SetStateAction<JobApplication[]>>;
  applicationsRef: MutableRefObject<JobApplication[]>;
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  notify: (msg: string) => void;
}

export interface OptimisticCrudResult {
  updateStatus: (id: string, newStatus: JobStatus, customDate?: string) => Promise<void>;
  saveApplication: (data: Partial<JobApplication>, existingId?: string) => Promise<void>;
  deleteApplication: (id: string, companyName?: string) => Promise<void>;
  addBatchApplications: (newApps: JobApplication[], duplicateCount: number) => Promise<void>;
  importApplicationsFromJson: (importedApps: JobApplication[], mode?: 'merge' | 'overwrite') => Promise<void>;
  applyInboxStatusUpdates: (
    updates: Array<{ appId: string; newStatus: JobStatus; noteAddition: string; meetingDate?: string }>
  ) => Promise<void>;
  addNewDiscoveredApp: (newApp: Partial<JobApplication>) => Promise<void>;
  bulkUpdateStatus: (selectedIds: string[], newStatus: JobStatus) => Promise<void>;
  bulkUpdateDate: (selectedIds: string[], newDate: string) => Promise<void>;
  bulkDelete: (selectedIds: string[]) => Promise<void>;
  resetToInitial: () => Promise<boolean>;
  reAnalyzeWithAi: (app: JobApplication) => Promise<void>;
}

/**
 * Owns all mutations of the applications collection. Each mutation applies an
 * optimistic update locally, then syncs to the server and rolls the affected
 * entries back to their captured originals when the sync fails.
 *
 * The two pieces that every mutation shares — the optimistic-update/rollback
 * sequence (`runOptimisticMutation`) and "overlay a map of patches onto the
 * collection" — live in helpers, so each mutation below only describes *what*
 * changes and *how* to undo it.
 */
export function useOptimisticCrud({
  applications,
  setApplications,
  applicationsRef,
  setSyncStatus,
  notify,
}: OptimisticCrudContext): OptimisticCrudResult {
  const run = useCallback(
    <T,>(mutation: OptimisticMutation<T>) =>
      runOptimisticMutation(mutation, { setSyncStatus, notify }),
    [setSyncStatus, notify]
  );

  // Overlays a map of partial patches onto the collection by id (used for both
  // the optimistic update and the rollback of every map-shaped mutation).
  const applyPatches = useCallback(
    (patches: ReadonlyMap<string, Partial<JobApplication>>) =>
      setApplications((prev) =>
        prev.map((app) => {
          const patch = patches.get(app.id);
          return patch ? { ...app, ...patch } : app;
        })
      ),
    [setApplications]
  );

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
      const newTimeline = appendStatusTransition(targetApp, newStatus, today);

      const updatePayload = {
        status: newStatus,
        timeline: newTimeline,
        lastUpdated: now,
      };

      await run({
        applyOptimistic: () => setApplications((prev) => prev.map((app) => (app.id === id ? { ...app, ...updatePayload } : app))),
        notifyOptimistic: () => notify(`Zmieniono status na: ${newStatus}`),
        request: () => api.updateApplication(id, updatePayload),
        rollback: () =>
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
          ),
        errorLabel: 'Failed to sync status update to server',
      });
    },
    [applicationsRef, notify, run, setApplications]
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
          updatedTimeline = appendStatusTransition(targetApp, data.status, today);
        }

        const updatePayload: Partial<JobApplication> = {
          ...data,
          timeline: updatedTimeline,
          lastUpdated: now,
        };

        await run({
          applyOptimistic: () => setApplications((prev) => prev.map((app) => (app.id === existingId ? { ...app, ...updatePayload } : app))),
          notifyOptimistic: () => notify('Zaktualizowano aplikację.'),
          request: () => api.updateApplication(existingId, updatePayload),
          rollback: () => setApplications((prev) => prev.map((app) => (app.id === existingId ? originalApp : app))),
          errorLabel: 'Failed to sync application update to server',
        });
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

        await run({
          applyOptimistic: () => setApplications((prev) => [newApp, ...prev]),
          notifyOptimistic: () => notify('Dodano nową aplikację!'),
          request: () => api.createApplication(newApp),
          rollback: () => setApplications((prev) => prev.filter((app) => app.id !== newApp.id)),
          errorLabel: 'Failed to sync new application to server',
        });
      }
    },
    [applicationsRef, notify, run, setApplications]
  );

  // Delete an application
  const deleteApplication = useCallback(
    async (id: string, companyName?: string) => {
      const targetApp = applicationsRef.current.find((a) => a.id === id);
      if (!targetApp) return;

      await run({
        applyOptimistic: () => setApplications((prev) => prev.filter((a) => a.id !== id)),
        notifyOptimistic: () =>
          notify(`Usunięto aplikację${companyName ? ` do firmy ${companyName}` : ''}.`),
        request: () => api.deleteApplication(id),
        rollback: () => setApplications((prev) => (prev.some((a) => a.id === targetApp.id) ? prev : [targetApp, ...prev])),
        errorLabel: 'Failed to sync deletion to server',
      });
    },
    [applicationsRef, notify, run, setApplications]
  );

  // Add multiple applications (from batch import)
  const addBatchApplications = useCallback(
    async (newApps: JobApplication[], duplicateCount: number) => {
      if (!newApps || newApps.length === 0) return;
      const addedIds = new Set(newApps.map((a) => a.id));

      await run({
        applyOptimistic: () => setApplications((prev) => [...newApps, ...prev]),
        notifyOptimistic: () =>
          duplicateCount > 0
            ? notify(
                `Pomyślnie dodano ${newApps.length} ofert (pominięto ${duplicateCount} duplikatów).`
              )
            : notify(`Pomyślnie zaimportowano ${newApps.length} nowych ofert!`),
        request: () => api.batchCreateApplications(newApps),
        rollback: () => setApplications((prev) => prev.filter((app) => !addedIds.has(app.id))),
        errorLabel: 'Failed to sync batch import to server',
      });
    },
    [notify, run, setApplications]
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

        const updatedTimeline = appendStatusTransition(
          app,
          update.newStatus,
          update.meetingDate || today,
          update.noteAddition || undefined
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

      await run({
        applyOptimistic: () => applyPatches(payloadMap),
        request: () => api.batchUpdateApplications(apiPayloads),
        rollback: () => setApplications((prev) => prev.map((app) => originalAppsMap.get(app.id) || app)),
        errorLabel: 'Failed to sync inbox updates to server',
      });
    },
    [applicationsRef, applyPatches, run, setApplications]
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

      await run({
        applyOptimistic: () => setApplications((prev) => [created, ...prev]),
        notifyOptimistic: () => notify(`Dodano ofertę wykrytą z poczty: ${created.company}`),
        request: () => api.createApplication(created),
        rollback: () => setApplications((prev) => prev.filter((app) => app.id !== created.id)),
        errorLabel: 'Failed to sync discovered email app to server',
      });
    },
    [applicationsRef, notify, run, setApplications]
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

        const updatedTimeline = appendStatusTransition(app, newStatus, today);

        updatesPayload.push({
          id: app.id,
          status: newStatus,
          timeline: updatedTimeline,
          lastUpdated: now,
        });
      }

      const updatesMap = new Map(updatesPayload.map((u) => [u.id, u]));

      await run({
        applyOptimistic: () => applyPatches(updatesMap),
        notifyOptimistic: () => notify(`Zmieniono status dla ${count} aplikacji na: ${newStatus}`),
        request: () => api.batchUpdateApplications(updatesPayload),
        rollback: () => applyPatches(originalMap),
        errorLabel: 'Failed to sync bulk status update to server',
      });
    },
    [applicationsRef, applyPatches, notify, run]
  );

  // Bulk date update with atomic batchUpdateApplications and rollback
  const bulkUpdateDate = useCallback(
    async (selectedIds: string[], newDate: string) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const now = new Date().toISOString();
      const selectedSet = new Set(selectedIds);

      const originalMap = new Map<string, { appliedDate: string; lastUpdated?: string }>();

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

      await run({
        applyOptimistic: () => applyPatches(updatesMap),
        notifyOptimistic: () =>
          notify(`Zaktualizowano datę wysłania dla ${count} aplikacji na: ${newDate}`),
        request: () => api.batchUpdateApplications(updatesPayload),
        rollback: () => applyPatches(originalMap),
        errorLabel: 'Failed to sync bulk date update to server',
      });
    },
    [applicationsRef, applyPatches, notify, run]
  );

  // Bulk delete with atomic batchDeleteApplications and rollback
  const bulkDelete = useCallback(
    async (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const selectedSet = new Set(selectedIds);
      const toDeleteApps = applicationsRef.current.filter((app) => selectedSet.has(app.id));

      await run({
        applyOptimistic: () => setApplications((prev) => prev.filter((app) => !selectedSet.has(app.id))),
        notifyOptimistic: () => notify(`Trwale usunięto ${count} zaznaczonych aplikacji.`),
        request: () => api.batchDeleteApplications(selectedIds),
        rollback: () =>
          setApplications((prev) => {
            const currentIds = new Set(prev.map((a) => a.id));
            const restored = toDeleteApps.filter((a) => !currentIds.has(a.id));
            return [...restored, ...prev];
          }),
        errorLabel: 'Failed to sync bulk delete to server',
      });
    },
    [applicationsRef, notify, run, setApplications]
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
  }, [notify, setApplications]);

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

        await run({
          applyOptimistic: () =>
            setApplications((prev) => prev.map((item) => (item.id === app.id ? { ...item, ...updates } : item))),
          request: () => api.updateApplication(app.id, updates),
          rollback: () =>
            setApplications((prev) => prev.map((item) => (item.id === app.id ? originalApp : item))),
          errorLabel: 'Failed to sync AI analysis update to server',
          onSuccess: () =>
            notify(
              `Zaktualizowano dane oferty: ${data.company || currentTarget.company} - ${data.role || currentTarget.role}`
            ),
        });
      } catch (e) {
        console.error(e);
        notify('Nie udało się przeanalizować linku przez AI.');
      }
    },
    [applicationsRef, notify, run, setApplications]
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
    [applications, notify, setApplications]
  );

  return {
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
