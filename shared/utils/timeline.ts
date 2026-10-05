import { ApplicationTimelineEntry, JobStatus } from '../types';

/**
 * Creates the initial timeline entry for an application.
 */
export function createInitialTimelineEntry(
  appId: string,
  status: JobStatus = 'Wysłana',
  date: string = new Date().toISOString().split('T')[0],
  notes?: string
): ApplicationTimelineEntry {
  return {
    id: `tl-init-${appId}`,
    status,
    date,
    ...(notes ? { notes } : {}),
  };
}

/**
 * Appends a new status transition to an application's timeline.
 * If the current timeline is empty or undefined, creates an initial entry first
 * using the fallback parameters, preserving timeline continuity.
 */
export function appendTimelineTransition(
  currentTimeline: ApplicationTimelineEntry[] | undefined,
  newStatus: JobStatus,
  date?: string,
  notes?: string,
  fallbackAppId?: string,
  fallbackAppliedDate?: string,
  fallbackPreviousStatus?: JobStatus
): ApplicationTimelineEntry[] {
  const effectiveDate = date || new Date().toISOString().split('T')[0];

  const existingTimeline: ApplicationTimelineEntry[] =
    currentTimeline && currentTimeline.length > 0
      ? [...currentTimeline]
      : [
          createInitialTimelineEntry(
            fallbackAppId || `app-${Date.now()}`,
            fallbackPreviousStatus || 'Wysłana',
            fallbackAppliedDate || effectiveDate
          ),
        ];

  const newEntry: ApplicationTimelineEntry = {
    id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    status: newStatus,
    date: effectiveDate,
    ...(notes ? { notes } : {}),
  };

  return [...existingTimeline, newEntry];
}
