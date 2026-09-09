import { describe, it, expect } from 'vitest';
import { boxContents, type ContentRow } from '../utils/boxContents';

const NOW = new Date('2026-03-10T12:00:00Z');
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000);

function content(overrides: Partial<ContentRow> = {}): ContentRow {
  return {
    id: 'vasara',
    name: 'Vasara',
    amount: 1,
    reservations: [],
    ...overrides,
  };
}

/**
 * Lending a box does not take back what somebody had already borrowed out of
 * it, so the box goes out one vasara short. The return screen must not then ask
 * the palauttaja for that vasara — an unticked line there files a huomio about
 * a missing kama, and the terms on that dialog have teeth.
 */
describe('boxContents', () => {
  it('expects a content nobody has borrowed', () => {
    const [vasara] = boxContents([content()], 'box-loan', NOW);
    expect(vasara.outOnLoan).toBe(false);
  });

  it('does not expect one that is out on somebody else’s loan', () => {
    const [vasara] = boxContents(
      [
        content({
          reservations: [{ loan: { id: 'other-loan', startTime: day(-2), endTime: day(2) } }],
        }),
      ],
      'box-loan',
      NOW,
    );
    expect(vasara.outOnLoan).toBe(true);
  });

  it('still expects one the same loan is holding as a line of its own', () => {
    // The box and the vasara are both on this loan: it is with the borrower
    // either way, so it is theirs to bring back.
    const [vasara] = boxContents(
      [
        content({
          reservations: [{ loan: { id: 'box-loan', startTime: day(-2), endTime: day(2) } }],
        }),
      ],
      'box-loan',
      NOW,
    );
    expect(vasara.outOnLoan).toBe(false);
  });

  it('ignores a booking that has not started or has already ended', () => {
    const [future] = boxContents(
      [
        content({
          reservations: [{ loan: { id: 'later', startTime: day(5), endTime: day(9) } }],
        }),
      ],
      'box-loan',
      NOW,
    );
    expect(future.outOnLoan).toBe(false);

    const [past] = boxContents(
      [
        content({
          reservations: [{ loan: { id: 'earlier', startTime: day(-9), endTime: day(-5) } }],
        }),
      ],
      'box-loan',
      NOW,
    );
    expect(past.outOnLoan).toBe(false);
  });

  it('reads serialized dates, which is how the page hands them over', () => {
    const [vasara] = boxContents(
      [
        content({
          reservations: [
            {
              loan: {
                id: 'other-loan',
                startTime: day(-1).toISOString(),
                endTime: day(1).toISOString(),
              },
            },
          ],
        }),
      ],
      'box-loan',
      NOW,
    );
    expect(vasara.outOnLoan).toBe(true);
  });

  it('carries the name and amount through, and copes with no box at all', () => {
    expect(boxContents(undefined, 'box-loan', NOW)).toEqual([]);
    expect(boxContents([content({ amount: 666 })], 'box-loan', NOW)[0]).toMatchObject({
      id: 'vasara',
      name: 'Vasara',
      amount: 666,
    });
  });
});
