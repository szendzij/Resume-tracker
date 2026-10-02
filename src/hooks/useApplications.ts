import { useState, useEffect, useCallback, useRef } from 'react';
import { JobApplication, JobStatus } from '../types';
import { INITIAL_JOB_APPLICATIONS } from '../data/initialJobs';
import { api } from '../services/api';
import { detectDuplicate } from '../utils/duplicateDetector';

const STORAGE_KEY = 'job_tracker_applications_v1';

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
  const isInitialSyncDone = useRef<boolean>(false);

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
      try {
        const serverApps = await api.getApplications();
        if (!isMounted) return;

        if (serverApps && serverApps.length > 0) {
          // Database has data -> use server data as source of truth
          setApplications(serverApps);
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
              setApplications(toBootstrap);
              notify(`Zsynchronizowano ${toBootstrap.length} ofert z bazą danych na serwerze!`);
            }
          }
        }
      } catch (err) {
        console.warn('Backend database sync unavailable, using local cache:', err);
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

  // Status change for single application
  const updateStatus = useCallback(
    (id: string, newStatus: JobStatus) => {
      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus, lastUpdated: now } : app
        )
      );
      api.updateApplication(id, { status: newStatus, lastUpdated: now }).catch((err) => {
        console.error('Failed to sync status update to server', err);
      });
      notify(`Zmieniono status na: ${newStatus}`);
    },
    [notify]
  );

  // Save or update an application
  const saveApplication = useCallback(
    (data: Partial<JobApplication>, existingId?: string) => {
      const now = new Date().toISOString();
      if (existingId) {
        setApplications((prev) =>
          prev.map((app) => (app.id === existingId ? ({ ...app, ...data, lastUpdated: now } as JobApplication) : app))
        );
        api.updateApplication(existingId, { ...data, lastUpdated: now }).catch((err) => {
          console.error('Failed to sync application update to server', err);
        });
        notify('Zaktualizowano aplikację.');
      } else {
        const newApp: JobApplication = {
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: data.role || 'Stanowisko',
          company: data.company || 'Firma',
          portal: data.portal || 'LinkedIn',
          url: data.url || '',
          appliedDate: data.appliedDate || now.split('T')[0],
          status: data.status || 'Wysłana',
          location: data.location,
          salary: data.salary,
          skills: data.skills || [],
          notes: data.notes,
          lastUpdated: now,
        };
        setApplications((prev) => [newApp, ...prev]);
        api.createApplication(newApp).catch((err) => {
          console.error('Failed to sync new application to server', err);
        });
        notify('Dodano nową aplikację!');
      }
    },
    [notify]
  );

  // Delete an application
  const deleteApplication = useCallback(
    (id: string, companyName?: string) => {
      setApplications((prev) => prev.filter((a) => a.id !== id));
      api.deleteApplication(id).catch((err) => {
        console.error('Failed to sync deletion to server', err);
      });
      notify(`Usunięto aplikację${companyName ? ` do firmy ${companyName}` : ''}.`);
    },
    [notify]
  );

  // Add multiple applications (from batch import)
  const addBatchApplications = useCallback(
    (newApps: JobApplication[], duplicateCount: number) => {
      setApplications((prev) => [...newApps, ...prev]);
      api.batchCreateApplications(newApps).catch((err) => {
        console.error('Failed to sync batch import to server', err);
      });
      if (duplicateCount > 0) {
        notify(`Pomyślnie dodano ${newApps.length} ofert (pominięto ${duplicateCount} duplikatów).`);
      } else {
        notify(`Pomyślnie zaimportowano ${newApps.length} nowych ofert!`);
      }
    },
    [notify]
  );

  // Apply status updates from inbox sync
  const applyInboxStatusUpdates = useCallback(
    (
      updates: Array<{
        appId: string;
        newStatus: JobStatus;
        noteAddition: string;
        meetingDate?: string;
      }>
    ) => {
      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) => {
          const update = updates.find((u) => u.appId === app.id);
          if (!update) return app;
          const updatedNotes = app.notes
            ? `${app.notes}\n${update.noteAddition}`
            : update.noteAddition;
          const updated = {
            ...app,
            status: update.newStatus,
            notes: updatedNotes,
            lastUpdated: now,
          };
          api.updateApplication(app.id, {
            status: update.newStatus,
            notes: updatedNotes,
            lastUpdated: now,
          }).catch((err) => console.error('Failed to sync inbox update', err));
          return updated;
        })
      );
    },
    []
  );

  // Add newly discovered app from inbox sync
  const addNewDiscoveredApp = useCallback(
    (newApp: Partial<JobApplication>) => {
      const now = new Date().toISOString();
      const created: JobApplication = {
        id: `job-email-${Date.now()}`,
        role: newApp.role || 'Stanowisko',
        company: newApp.company || 'Nowa firma',
        portal: newApp.portal || 'E-mail',
        url: newApp.url || '',
        appliedDate: newApp.appliedDate || now.split('T')[0],
        status: newApp.status || 'Weryfikacja CV',
        location: newApp.location || 'Polska / Remote',
        salary: newApp.salary || '',
        skills: newApp.skills || [],
        notes: newApp.notes || 'Wykryto automatycznie z korespondencji e-mail.',
        lastUpdated: now,
      };

      const dupCheck = detectDuplicate(created, applications);
      if (dupCheck.isDuplicate) {
        notify(`Pominięto duplikat z poczty: ${dupCheck.reason || created.company}`);
        return;
      }

      setApplications((prev) => [created, ...prev]);
      api.createApplication(created).catch((err) => {
        console.error('Failed to sync discovered email app to server', err);
      });
      notify(`Dodano ofertę wykrytą z poczty: ${created.company}`);
    },
    [applications, notify]
  );

  // Bulk status update
  const bulkUpdateStatus = useCallback(
    (selectedIds: string[], newStatus: JobStatus) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.includes(app.id)
            ? { ...app, status: newStatus, lastUpdated: now }
            : app
        )
      );
      selectedIds.forEach((id) => {
        api.updateApplication(id, { status: newStatus, lastUpdated: now }).catch((err) =>
          console.error(`Failed to update status for ${id}`, err)
        );
      });
      notify(`Zmieniono status dla ${count} aplikacji na: ${newStatus}`);
    },
    [notify]
  );

  // Bulk date update
  const bulkUpdateDate = useCallback(
    (selectedIds: string[], newDate: string) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      const now = new Date().toISOString();
      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.includes(app.id)
            ? { ...app, appliedDate: newDate, lastUpdated: now }
            : app
        )
      );
      selectedIds.forEach((id) => {
        api.updateApplication(id, { appliedDate: newDate, lastUpdated: now }).catch((err) =>
          console.error(`Failed to update date for ${id}`, err)
        );
      });
      notify(`Zaktualizowano datę wysłania dla ${count} aplikacji na: ${newDate}`);
    },
    [notify]
  );

  // Bulk delete
  const bulkDelete = useCallback(
    (selectedIds: string[]) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      setApplications((prev) => prev.filter((app) => !selectedIds.includes(app.id)));
      api.batchDeleteApplications(selectedIds).catch((err) => {
        console.error('Failed to bulk delete from server', err);
      });
      notify(`Trwale usunięto ${count} zaznaczonych aplikacji.`);
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

        const updatedSkills = data.skills && Array.isArray(data.skills) && data.skills.length > 0
          ? Array.from(new Set([...(app.skills || []), ...data.skills]))
          : app.skills;

        const updatedNotes = data.notes
          ? app.notes
            ? `${app.notes}\n[AI]: ${data.notes}`
            : `[AI]: ${data.notes}`
          : app.notes;

        const updates: Partial<JobApplication> = {
          role: data.role || app.role,
          company: data.company || app.company,
          portal: data.portal || app.portal,
          location: data.location || app.location,
          salary: data.salary || app.salary,
          skills: updatedSkills,
          notes: updatedNotes,
          lastUpdated: now,
        };

        setApplications((prev) =>
          prev.map((item) => (item.id === app.id ? { ...item, ...updates } : item))
        );

        api.updateApplication(app.id, updates).catch((err) => {
          console.error('Failed to sync AI analysis update to server', err);
        });

        notify(`Zaktualizowano dane oferty: ${data.company || app.company} - ${data.role || app.role}`);
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
    setApplications,
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
