import { useState, useEffect, useCallback } from 'react';
import { JobApplication, JobStatus } from '../types';
import { INITIAL_JOB_APPLICATIONS } from '../data/initialJobs';
import { api } from '../services/api';

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

  // Save applications to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }
  }, [applications]);

  const notify = useCallback(
    (msg: string) => {
      if (onNotification) onNotification(msg);
    },
    [onNotification]
  );

  // Status change for single application
  const updateStatus = useCallback(
    (id: string, newStatus: JobStatus) => {
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() } : app
        )
      );
      notify(`Zmieniono status na: ${newStatus}`);
    },
    [notify]
  );

  // Save or update an application
  const saveApplication = useCallback(
    (data: Partial<JobApplication>, existingId?: string) => {
      if (existingId) {
        setApplications((prev) =>
          prev.map((app) => (app.id === existingId ? ({ ...app, ...data } as JobApplication) : app))
        );
        notify('Zaktualizowano aplikację.');
      } else {
        const newApp: JobApplication = {
          id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          role: data.role || 'QA Engineer',
          company: data.company || 'Firma',
          portal: data.portal || 'LinkedIn',
          url: data.url || '',
          appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
          status: data.status || 'Wysłana',
          location: data.location,
          salary: data.salary,
          skills: data.skills || [],
          notes: data.notes,
          lastUpdated: new Date().toISOString(),
        };
        setApplications((prev) => [newApp, ...prev]);
        notify('Dodano nową aplikację!');
      }
    },
    [notify]
  );

  // Delete an application
  const deleteApplication = useCallback(
    (id: string, companyName?: string) => {
      setApplications((prev) => prev.filter((a) => a.id !== id));
      notify(`Usunięto aplikację${companyName ? ` do firmy ${companyName}` : ''}.`);
    },
    [notify]
  );

  // Add multiple applications (from batch import)
  const addBatchApplications = useCallback(
    (newApps: JobApplication[], duplicateCount: number) => {
      setApplications((prev) => [...newApps, ...prev]);
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
      setApplications((prev) =>
        prev.map((app) => {
          const update = updates.find((u) => u.appId === app.id);
          if (!update) return app;
          const updatedNotes = app.notes
            ? `${app.notes}\n${update.noteAddition}`
            : update.noteAddition;
          return {
            ...app,
            status: update.newStatus,
            notes: updatedNotes,
            lastUpdated: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  // Add newly discovered app from inbox sync
  const addNewDiscoveredApp = useCallback(
    (newApp: Partial<JobApplication>) => {
      const created: JobApplication = {
        id: `job-email-${Date.now()}`,
        role: newApp.role || 'Specjalista QA',
        company: newApp.company || 'Nowa firma',
        portal: newApp.portal || 'E-mail',
        url: newApp.url || '',
        appliedDate: newApp.appliedDate || new Date().toISOString().split('T')[0],
        status: newApp.status || 'Weryfikacja CV',
        location: newApp.location || 'Polska / Remote',
        salary: newApp.salary || '',
        skills: newApp.skills || ['QA'],
        notes: newApp.notes || 'Wykryto automatycznie z korespondencji e-mail.',
        lastUpdated: new Date().toISOString(),
      };
      setApplications((prev) => [created, ...prev]);
      notify(`Dodano ofertę wykrytą z poczty: ${created.company}`);
    },
    [notify]
  );

  // Bulk status update
  const bulkUpdateStatus = useCallback(
    (selectedIds: string[], newStatus: JobStatus) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.includes(app.id)
            ? { ...app, status: newStatus, lastUpdated: new Date().toISOString() }
            : app
        )
      );
      notify(`Zmieniono status dla ${count} aplikacji na: ${newStatus}`);
    },
    [notify]
  );

  // Bulk date update
  const bulkUpdateDate = useCallback(
    (selectedIds: string[], newDate: string) => {
      if (selectedIds.length === 0) return;
      const count = selectedIds.length;
      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.includes(app.id)
            ? { ...app, appliedDate: newDate, lastUpdated: new Date().toISOString() }
            : app
        )
      );
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
      notify(`Trwale usunięto ${count} zaznaczonych aplikacji.`);
    },
    [notify]
  );

  // Reset to initial 25 QA jobs
  const resetToInitial = useCallback(() => {
    if (
      window.confirm(
        'Czy na pewno chcesz przywrócić początkowy zestaw 25 ofert QA z linkami? Wprowadzone zmiany zostaną zastąpione danymi startowymi.'
      )
    ) {
      setApplications(INITIAL_JOB_APPLICATIONS);
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

        setApplications((prev) =>
          prev.map((item) => {
            if (item.id === app.id) {
              return {
                ...item,
                role: data.role || item.role,
                company: data.company || item.company,
                portal: data.portal || item.portal,
                location: data.location || item.location,
                salary: data.salary || item.salary,
                skills:
                  data.skills && Array.isArray(data.skills) && data.skills.length > 0
                    ? Array.from(new Set([...(item.skills || []), ...data.skills]))
                    : item.skills,
                notes: data.notes
                  ? item.notes
                    ? `${item.notes}\n[AI]: ${data.notes}`
                    : `[AI]: ${data.notes}`
                  : item.notes,
                lastUpdated: new Date().toISOString(),
              };
            }
            return item;
          })
        );

        notify(`Zaktualizowano dane oferty: ${data.company || app.company} - ${data.role || app.role}`);
      } catch (e) {
        console.error(e);
        notify('Nie udało się przeanalizować linku przez AI.');
      }
    },
    [notify]
  );

  return {
    applications,
    setApplications,
    updateStatus,
    saveApplication,
    deleteApplication,
    addBatchApplications,
    applyInboxStatusUpdates,
    addNewDiscoveredApp,
    bulkUpdateStatus,
    bulkUpdateDate,
    bulkDelete,
    resetToInitial,
    reAnalyzeWithAi,
  };
}
