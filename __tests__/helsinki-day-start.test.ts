import { describe, it, expect } from 'vitest';
import { helsinkiDayStart } from '../utils/dateFormat';

describe('helsinkiDayStart', () => {
  it('gives tomorrow and the day after in summer time (UTC+3)', () => {
    const now = new Date('2026-06-15T09:00:00Z'); // 12:00 in Helsinki
    expect(helsinkiDayStart(now, 1).toISOString()).toBe('2026-06-15T21:00:00.000Z');
    expect(helsinkiDayStart(now, 2).toISOString()).toBe('2026-06-16T21:00:00.000Z');
  });

  it('gives tomorrow in winter time (UTC+2)', () => {
    const now = new Date('2026-01-15T09:00:00Z');
    expect(helsinkiDayStart(now, 1).toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('reads the day off the Helsinki clock, not UTC', () => {
    // 23:30 UTC on the 15th is already 01:30 on the 16th in Helsinki.
    const now = new Date('2026-01-15T23:30:00Z');
    expect(helsinkiDayStart(now, 0).toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('spans the DST switch: the day the clocks go back is 25 h long', () => {
    const now = new Date('2026-10-24T09:00:00Z'); // Sat; clocks go back Sun 25.10.
    const start = helsinkiDayStart(now, 1);
    const end = helsinkiDayStart(now, 2);
    expect(start.toISOString()).toBe('2026-10-24T21:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });
});
