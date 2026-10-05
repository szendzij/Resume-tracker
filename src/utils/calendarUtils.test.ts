import { describe, it, expect } from 'vitest';
import {
  getCalendarDays,
  getWeekDays,
  extractCalendarEvents,
  formatDateToYYYYMMDD,
  classifyEventType,
  formatMonthYear,
  normalizeDateString,
} from './calendarUtils';
import { JobApplication } from '../types';

describe('calendarUtils', () => {
  describe('formatDateToYYYYMMDD & normalizeDateString', () => {
    it('formats Date object to YYYY-MM-DD', () => {
      const d = new Date(2026, 9, 5); // 5 Oct 2026
      expect(formatDateToYYYYMMDD(d)).toBe('2026-10-05');
    });

    it('normalizes ISO string to YYYY-MM-DD', () => {
      expect(normalizeDateString('2026-10-05T14:30:00.000Z')).toBe('2026-10-05');
      expect(normalizeDateString('2026-10-05')).toBe('2026-10-05');
      expect(normalizeDateString('')).toBe('');
    });
  });

  describe('classifyEventType', () => {
    it('correctly classifies interview statuses', () => {
      expect(classifyEventType('Rozmowa HR')).toBe('interview');
      expect(classifyEventType('Rozmowa techniczna')).toBe('interview');
    });

    it('correctly classifies task and offer statuses', () => {
      expect(classifyEventType('Zadanie rekrutacyjne')).toBe('task');
      expect(classifyEventType('Oferta')).toBe('offer');
    });

    it('correctly classifies applied status', () => {
      expect(classifyEventType('Wysłana')).toBe('applied');
      expect(classifyEventType('Do zaaplikowania')).toBe('applied');
    });
  });

  describe('extractCalendarEvents', () => {
    const mockApps: JobApplication[] = [
      {
        id: 'app-1',
        role: 'Frontend Dev',
        company: 'Google',
        portal: 'LinkedIn',
        url: 'https://example.com/1',
        appliedDate: '2026-10-01',
        status: 'Rozmowa techniczna',
        timeline: [
          { id: 't1', status: 'Wysłana', date: '2026-10-01' },
          { id: 't2', status: 'Rozmowa HR', date: '2026-10-08', notes: 'Zadzwoni Ania' },
          { id: 't3', status: 'Rozmowa techniczna', date: '2026-10-15', notes: 'Live coding' },
        ],
      },
      {
        id: 'app-2',
        role: 'Backend Dev',
        company: 'Spotify',
        portal: 'JustJoinIT',
        url: 'https://example.com/2',
        appliedDate: '2026-10-05',
        status: 'Wysłana',
      },
    ];

    it('extracts primary application dates and distinct timeline milestones', () => {
      const events = extractCalendarEvents(mockApps, 'all');

      // app-1 has applied event on 2026-10-01, timeline Rozmowa HR on 2026-10-08, Rozmowa techniczna on 2026-10-15
      // app-2 has applied event on 2026-10-05
      expect(events.length).toBe(4);

      const dates = events.map((e) => e.date);
      expect(dates).toContain('2026-10-01');
      expect(dates).toContain('2026-10-05');
      expect(dates).toContain('2026-10-08');
      expect(dates).toContain('2026-10-15');
    });

    it('filters only interviews and recruitment tasks', () => {
      const interviewEvents = extractCalendarEvents(mockApps, 'interviews');
      expect(interviewEvents.length).toBe(2);
      expect(interviewEvents[0].status).toBe('Rozmowa HR');
      expect(interviewEvents[1].status).toBe('Rozmowa techniczna');
    });

    it('filters only applied events', () => {
      const appliedEvents = extractCalendarEvents(mockApps, 'applied');
      expect(appliedEvents.length).toBe(2);
      expect(appliedEvents.every((e) => e.type === 'applied')).toBe(true);
    });
  });

  describe('getCalendarDays', () => {
    it('generates a full monthly grid starting on Monday with proper padding', () => {
      // October 2026: 1st Oct is a Thursday, month has 31 days
      const days = getCalendarDays(2026, 9, []); // month is 0-indexed (9 = Oct)

      // Total days in calendar grid should be a multiple of 7 (35 or 42)
      expect(days.length % 7).toBe(0);
      expect(days.length).toBeGreaterThanOrEqual(35);

      // The 1st day of the grid should be Monday
      expect(days[0].date.getDay()).toBe(1); // 1 = Monday

      // Check current month flags
      const currentMonthDays = days.filter((d) => d.isCurrentMonth);
      expect(currentMonthDays.length).toBe(31);
      expect(currentMonthDays[0].dayNumber).toBe(1);
      expect(currentMonthDays[30].dayNumber).toBe(31);
    });

    it('attaches events to corresponding calendar days', () => {
      const events = [
        {
          id: 'ev-1',
          applicationId: 'app-1',
          application: { id: 'app-1', role: 'Dev', company: 'Acme', portal: 'LinkedIn', url: '', appliedDate: '2026-10-10', status: 'Wysłana' as const },
          date: '2026-10-10',
          type: 'applied' as const,
          title: 'Dev @ Acme',
          status: 'Wysłana' as const,
          isMilestone: false,
        },
      ];

      const days = getCalendarDays(2026, 9, events);
      const day10 = days.find((d) => d.isCurrentMonth && d.dayNumber === 10);
      expect(day10).toBeDefined();
      expect(day10?.events.length).toBe(1);
      expect(day10?.events[0].title).toBe('Dev @ Acme');
    });
  });

  describe('getWeekDays', () => {
    it('returns exactly 7 days starting from Monday', () => {
      const refDate = new Date(2026, 9, 8); // Thursday 8 Oct 2026
      const week = getWeekDays(refDate);

      expect(week.length).toBe(7);
      expect(week[0].date.getDay()).toBe(1); // Monday
      expect(week[6].date.getDay()).toBe(0); // Sunday
      expect(week[0].dayNumber).toBe(5); // Mon 5 Oct
      expect(week[6].dayNumber).toBe(11); // Sun 11 Oct
    });
  });

  describe('formatMonthYear', () => {
    it('formats date in Polish', () => {
      const d = new Date(2026, 9, 1);
      expect(formatMonthYear(d)).toBe('Październik 2026');
    });
  });
});
