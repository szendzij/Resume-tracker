import { describe, it, expect } from 'vitest';
import { JobApplication } from '../src/types';
import { getLatestStatusDate, getTimelineStatusDate } from '../src/utils/statusConfig';

describe('Status Timeline and Dates', () => {
  const baseApp: JobApplication = {
    id: 'test-job-1',
    role: 'QA Engineer',
    company: 'Tech Corp',
    portal: 'LinkedIn',
    url: 'https://example.com/job/1',
    appliedDate: '2026-10-01',
    status: 'Wysłana',
  };

  it('returns appliedDate when application has no timeline', () => {
    expect(getLatestStatusDate(baseApp)).toBe('2026-10-01');
    expect(getTimelineStatusDate(baseApp, 'Rozmowa HR')).toBeUndefined();
  });

  it('returns the date of the current status from timeline', () => {
    const appWithTimeline: JobApplication = {
      ...baseApp,
      status: 'Rozmowa HR',
      timeline: [
        { id: 'tl-1', status: 'Wysłana', date: '2026-10-01' },
        { id: 'tl-2', status: 'Rozmowa HR', date: '2026-10-08', notes: 'Rozmowa z rekruterką' },
      ],
    };

    expect(getLatestStatusDate(appWithTimeline)).toBe('2026-10-08');
    expect(getTimelineStatusDate(appWithTimeline, 'Rozmowa HR')).toBe('2026-10-08');
    expect(getTimelineStatusDate(appWithTimeline, 'Wysłana')).toBe('2026-10-01');
    expect(getTimelineStatusDate(appWithTimeline, 'Rozmowa techniczna')).toBeUndefined();
  });

  it('tracks progression from Rozmowa HR to Rozmowa techniczna with individual dates', () => {
    const appWithStages: JobApplication = {
      ...baseApp,
      status: 'Rozmowa techniczna',
      timeline: [
        { id: 'tl-1', status: 'Wysłana', date: '2026-10-01' },
        { id: 'tl-2', status: 'Rozmowa HR', date: '2026-10-08', notes: 'Przeszło pozytywnie' },
        { id: 'tl-3', status: 'Rozmowa techniczna', date: '2026-10-15', notes: 'Live coding z leadeem' },
      ],
    };

    expect(getLatestStatusDate(appWithStages)).toBe('2026-10-15');
    expect(getTimelineStatusDate(appWithStages, 'Rozmowa HR')).toBe('2026-10-08');
    expect(getTimelineStatusDate(appWithStages, 'Rozmowa techniczna')).toBe('2026-10-15');
  });

  it('handles multiple stages of the same status by returning the latest date', () => {
    const appWithMultipleSameStatus: JobApplication = {
      ...baseApp,
      status: 'Rozmowa techniczna',
      timeline: [
        { id: 'tl-1', status: 'Wysłana', date: '2026-10-01' },
        { id: 'tl-2', status: 'Rozmowa techniczna', date: '2026-10-10', notes: 'Etap 1' },
        { id: 'tl-3', status: 'Rozmowa techniczna', date: '2026-10-18', notes: 'Etap 2 architektura' },
      ],
    };

    expect(getLatestStatusDate(appWithMultipleSameStatus)).toBe('2026-10-18');
    expect(getTimelineStatusDate(appWithMultipleSameStatus, 'Rozmowa techniczna')).toBe('2026-10-18');
  });
});
