import { describe, it, expect } from 'vitest';
import { DEFAULT_STATUS, ALL_STATUSES } from './index';

describe('DEFAULT_STATUS', () => {
  it('exists and equals "Wysłana"', () => {
    expect(DEFAULT_STATUS).toBe('Wysłana');
  });

  it('is a member of ALL_STATUSES', () => {
    expect(ALL_STATUSES).toContain(DEFAULT_STATUS);
  });
});
