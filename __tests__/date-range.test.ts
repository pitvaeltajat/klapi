import { describe, it, expect } from 'vitest';
import { formatDateRange } from '@/utils/dateFormat';

describe('formatDateRange', () => {
  it('shows the year once within a single year', () => {
    expect(formatDateRange('2026-10-19T12:00:00Z', '2026-10-26T12:00:00Z')).toBe(
      '19.10.–26.10.2026',
    );
  });

  it('carries both years across a New Year span', () => {
    expect(formatDateRange('2026-12-31T12:00:00Z', '2027-01-02T12:00:00Z')).toBe(
      '31.12.2026–2.1.2027',
    );
  });
});
