import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  ALL_STATUSES,
  formatPolishDate,
  getRelativeDays,
  getPortalBadgeStyle,
} from './statusConfig';

describe('statusConfig', () => {
  it('should define styling and description for every status in ALL_STATUSES', () => {
    expect(ALL_STATUSES.length).toBeGreaterThan(0);
    ALL_STATUSES.forEach((status) => {
      const config = STATUS_CONFIG[status];
      expect(config).toBeDefined();
      expect(config.label).toBe(status);
      expect(config.badgeClass).toBeTruthy();
      expect(config.description).toBeTruthy();
    });
  });

  describe('formatPolishDate', () => {
    it('should format ISO YYYY-MM-DD date into Polish date', () => {
      expect(formatPolishDate('2026-01-15')).toBe('15 sty 2026');
      expect(formatPolishDate('2026-05-03')).toBe('3 maj 2026');
      expect(formatPolishDate('2026-11-20')).toBe('20 lis 2026');
      expect(formatPolishDate('2026-12-31')).toBe('31 gru 2026');
    });

    it('should return fallback for missing or malformed dates', () => {
      expect(formatPolishDate('')).toBe('Brak daty');
      expect(formatPolishDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('getRelativeDays', () => {
    it('should return empty string for empty input', () => {
      expect(getRelativeDays('')).toBe('');
    });

    it('should return "dzisiaj" for today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getRelativeDays(today)).toBe('dzisiaj');
    });

    it('should return "wczoraj" for 1 day ago', () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const yesterday = d.toISOString().split('T')[0];
      expect(getRelativeDays(yesterday)).toBe('wczoraj');
    });

    it('should return "X dni temu" for past dates', () => {
      const d = new Date();
      d.setDate(d.getDate() - 5);
      const past = d.toISOString().split('T')[0];
      expect(getRelativeDays(past)).toBe('5 dni temu');
    });

    it('should return "za X dni" for future dates', () => {
      const d = new Date();
      d.setDate(d.getDate() + 3);
      const future = d.toISOString().split('T')[0];
      expect(getRelativeDays(future)).toBe('za 3 dni');
    });
  });

  describe('getPortalBadgeStyle', () => {
    it('should return specific styles for LinkedIn', () => {
      const style = getPortalBadgeStyle('LinkedIn');
      expect(style.text).toContain('#0077b5');
    });

    it('should return specific styles for NoFluffJobs', () => {
      const style = getPortalBadgeStyle('NoFluffJobs');
      expect(style.text).toContain('emerald');
    });

    it('should return specific styles for Just Join IT', () => {
      const style = getPortalBadgeStyle('Just Join IT');
      expect(style.text).toContain('pink');
    });

    it('should return fallback styles for unknown portals', () => {
      const style = getPortalBadgeStyle('Custom Portal');
      expect(style.bg).toContain('slate');
    });
  });
});
