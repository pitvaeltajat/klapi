import { describe, it, expect } from 'vitest';
import { nextRangeAfterClick, previewRange, type DateRange } from '../utils/dateRange';

const day = (d: number) => new Date(2025, 4, d, 12, 0, 0, 0);
const dayOf = (d: Date | null) => (d ? d.getDate() : null);

describe('nextRangeAfterClick', () => {
  it('starts a new range when nothing is picked', () => {
    expect(nextRangeAfterClick([null, null], day(10)).map(dayOf)).toEqual([10, null]);
  });

  it('closes a half-open range on a later day', () => {
    expect(nextRangeAfterClick([day(10), null], day(14)).map(dayOf)).toEqual([10, 14]);
  });

  it('closes a half-open range on the same day', () => {
    expect(nextRangeAfterClick([day(10), null], day(10)).map(dayOf)).toEqual([10, 10]);
  });

  it('swaps the ends when the second click lands before the start', () => {
    expect(nextRangeAfterClick([day(10), null], day(6)).map(dayOf)).toEqual([6, 10]);
  });

  it('restarts from the clicked day once the range is complete', () => {
    expect(nextRangeAfterClick([day(10), day(14)], day(20)).map(dayOf)).toEqual([20, null]);
  });
});

describe('previewRange', () => {
  it('shows the committed range unchanged when nothing is hovered', () => {
    const preview = previewRange([day(10), day(14)], null);
    expect([dayOf(preview.start), dayOf(preview.end)]).toEqual([10, 14]);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([false, false]);
  });

  it('marks the end as pending while it is still unpicked', () => {
    const preview = previewRange([day(10), null], null);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([false, true]);
  });

  it('marks only the start as pending before anything is picked', () => {
    const preview = previewRange([null, null], null);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([true, false]);
  });

  it('previews only the end when hovering after the start', () => {
    const preview = previewRange([day(10), null], day(14));
    expect([dayOf(preview.start), dayOf(preview.end)]).toEqual([10, 14]);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([false, true]);
    expect(preview.end?.getHours()).toBe(18); // default return time applied
  });

  it('previews both ends when hovering before the start (swap)', () => {
    const preview = previewRange([day(10), null], day(6));
    expect([dayOf(preview.start), dayOf(preview.end)]).toEqual([6, 10]);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([true, true]);
  });

  it('previews a restart — new start, cleared end — over a complete range', () => {
    const preview = previewRange([day(10), day(14)], day(20));
    expect([dayOf(preview.start), dayOf(preview.end)]).toEqual([20, null]);
    expect([preview.pendingStart, preview.pendingEnd]).toEqual([true, true]);
  });

  it('does not mark an end that the hovered click would leave alone', () => {
    const range: DateRange = [day(10), null];
    const preview = previewRange(range, day(10));
    expect(preview.pendingStart).toBe(false);
    expect(preview.pendingEnd).toBe(true);
    expect(preview.end?.getHours()).toBe(23); // same-day loan runs to end of day
  });
});
