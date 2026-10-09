import { describe, it, expect } from 'vitest';
import { ReservationStatus } from '@prisma/client';
import { boxMovements } from '../utils/loanHelpers';

const { ACCEPTED, INUSE, IN_BOX, RETURNED } = ReservationStatus;
const line = (itemId: string, status: ReservationStatus, amount = 1) => ({ itemId, status, amount });

describe('boxMovements', () => {
  it('counts kamat put into the box by hand', () => {
    expect(boxMovements([line('a', INUSE, 3)], [line('a', IN_BOX, 3)])).toEqual({
      toBox: 3,
      processed: 0,
    });
  });

  it('counts a partial return of a multi-kama line', () => {
    expect(
      boxMovements([line('a', INUSE, 3)], [line('a', IN_BOX, 2), line('a', INUSE, 1)]),
    ).toEqual({ toBox: 2, processed: 0 });
  });

  it('counts processing out of the box', () => {
    expect(boxMovements([line('a', IN_BOX, 2)], [line('a', RETURNED, 2)])).toEqual({
      toBox: 0,
      processed: 2,
    });
  });

  it('counts kamat processed straight from out as processed only', () => {
    expect(boxMovements([line('a', ACCEPTED)], [line('a', RETURNED)])).toEqual({
      toBox: 0,
      processed: 1,
    });
  });

  it('does not read adding or removing kamat as a return', () => {
    expect(
      boxMovements(
        [line('a', INUSE), line('b', INUSE)],
        [line('a', INUSE), line('c', IN_BOX)],
      ),
    ).toEqual({ toBox: 0, processed: 0 });
  });

  it('does not count an admin undoing a return', () => {
    expect(boxMovements([line('a', IN_BOX)], [line('a', INUSE)])).toEqual({
      toBox: 0,
      processed: 0,
    });
  });
});
