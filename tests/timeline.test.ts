import { describe, it, expect } from 'vitest';
import {
  createInitialTimelineEntry,
  appendTimelineTransition,
} from '../shared/utils/timeline';
import { ApplicationTimelineEntry, JobStatus } from '../shared/types';

describe('timeline utilities', () => {
  describe('createInitialTimelineEntry', () => {
    it('creates an entry with default status and current date if not specified', () => {
      const entry = createInitialTimelineEntry('app-123');
      expect(entry.id).toBe('tl-init-app-123');
      expect(entry.status).toBe('Wysłana');
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('creates an entry with custom status, date, and notes', () => {
      const entry = createInitialTimelineEntry(
        'app-456',
        'Do zaaplikowania',
        '2026-10-05',
        'Zapisano z rozszerzenia'
      );
      expect(entry).toEqual({
        id: 'tl-init-app-456',
        status: 'Do zaaplikowania',
        date: '2026-10-05',
        notes: 'Zapisano z rozszerzenia',
      });
    });
  });

  describe('appendTimelineTransition', () => {
    it('synthesizes initial timeline when currentTimeline is undefined', () => {
      const result = appendTimelineTransition(
        undefined,
        'Rozmowa HR',
        '2026-10-10',
        'Pierwszy kontakt',
        'app-999',
        '2026-10-01',
        'Wysłana'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'tl-init-app-999',
        status: 'Wysłana',
        date: '2026-10-01',
      });
      expect(result[1].status).toBe('Rozmowa HR');
      expect(result[1].date).toBe('2026-10-10');
      expect(result[1].notes).toBe('Pierwszy kontakt');
      expect(result[1].id).toMatch(/^tl-\d+-[a-z0-9]+$/);
    });

    it('synthesizes initial timeline when currentTimeline is empty array', () => {
      const result = appendTimelineTransition(
        [],
        'Rozmowa techniczna',
        '2026-10-12',
        undefined,
        'app-1',
        '2026-10-02'
      );

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('Wysłana');
      expect(result[0].date).toBe('2026-10-02');
      expect(result[1].status).toBe('Rozmowa techniczna');
      expect(result[1].date).toBe('2026-10-12');
    });

    it('appends to an existing timeline without mutating original array', () => {
      const initialTimeline: ApplicationTimelineEntry[] = [
        { id: 'tl-init-1', status: 'Wysłana', date: '2026-10-01' },
      ];

      const result = appendTimelineTransition(
        initialTimeline,
        'Rozmowa HR',
        '2026-10-05',
        'Rozmowa z rekruterką'
      );

      expect(result).toHaveLength(2);
      expect(initialTimeline).toHaveLength(1); // immutability check
      expect(result[0]).toEqual(initialTimeline[0]);
      expect(result[1].status).toBe('Rozmowa HR');
      expect(result[1].date).toBe('2026-10-05');
      expect(result[1].notes).toBe('Rozmowa z rekruterką');
    });

    it('uses current date as default when date is omitted', () => {
      const initialTimeline: ApplicationTimelineEntry[] = [
        { id: 'tl-init-1', status: 'Wysłana', date: '2026-10-01' },
      ];

      const result = appendTimelineTransition(initialTimeline, 'Oferta');

      expect(result).toHaveLength(2);
      expect(result[1].status).toBe('Oferta');
      expect(result[1].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result[1].notes).toBeUndefined();
    });
  });
});
