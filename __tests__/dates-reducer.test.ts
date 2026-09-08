/**
 * Unit tests for `contexts/DatesContext`'s reducer — specifically the coupling
 * between `datesSet` and `planAhead`, which is what keeps the kaluston kone a
 * kiosk for the next person in the queue.
 */

import { describe, it, expect } from 'vitest';
import { datesReducer, initialDatesState } from '@/contexts/DatesContext';

const planningAhead = { ...initialDatesState, planAhead: true, datesSet: true };

describe('datesReducer — planAhead', () => {
  it('starts off, so the kiosk opens on its own flow', () => {
    expect(initialDatesState.planAhead).toBe(false);
  });

  it('survives picking the dates it was turned on for', () => {
    const next = datesReducer(
      { ...initialDatesState, planAhead: true },
      { type: 'SET_DATES_SET', payload: true },
    );
    expect(next).toMatchObject({ datesSet: true, planAhead: true });
  });

  it('comes down when the dates are cleared', () => {
    // The post-submit kiosk reset and the cart's "Nollaa päivät" are both this
    // action; either one has to hand the wall screen back to the kiosk flow.
    const next = datesReducer(planningAhead, { type: 'SET_DATES_SET', payload: false });
    expect(next).toMatchObject({ datesSet: false, planAhead: false });
  });

  it('does not turn itself on when dates are cleared normally', () => {
    const next = datesReducer(initialDatesState, { type: 'SET_DATES_SET', payload: false });
    expect(next.planAhead).toBe(false);
  });

  it('is restored with the rest of the persisted state', () => {
    const next = datesReducer(initialDatesState, {
      type: 'RESTORE_DATES',
      payload: planningAhead,
    });
    expect(next.planAhead).toBe(true);
  });
});
