import { describe, it, expect } from 'vitest';
import {
  boxContents,
  outstandingBoxContents,
  type ContentLocation,
  type ContentRow,
} from '../utils/boxContents';

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
const box = (...items: ContentRow[]): ContentLocation => ({ items });

describe('boxContents', () => {
  it('lists what is in the sub-sijainnit too, since they go out with the box', () => {
    const pakki: ContentLocation = {
      items: [content({ id: 'vasara' })],
      children: [{ items: [content({ id: 'ruuvi', name: 'Ruuvi' })], children: [] }],
    };
    expect(boxContents(pakki, 'box-loan', [], NOW).map((c) => c.id)).toEqual(['vasara', 'ruuvi']);
  });

  it('expects a content nobody has borrowed', () => {
    const [vasara] = boxContents(box(content()), 'box-loan', [], NOW);
    expect(vasara.outOnLoan).toBe(false);
  });

  it('does not expect one that is out on somebody else’s loan', () => {
    const [vasara] = boxContents(
      box(
        content({
          reservations: [{ loan: { id: 'other-loan', startTime: day(-2), endTime: day(2) } }],
        }),
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(vasara.outOnLoan).toBe(true);
  });

  it('still expects one the same loan is holding as a line of its own', () => {
    // The box and the vasara are both on this loan: it is with the borrower
    // either way, so it is theirs to bring back.
    const [vasara] = boxContents(
      box(
        content({
          reservations: [{ loan: { id: 'box-loan', startTime: day(-2), endTime: day(2) } }],
        }),
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(vasara.outOnLoan).toBe(false);
  });

  it('ignores a booking that has not started or has already ended', () => {
    const [future] = boxContents(
      box(
        content({
          reservations: [{ loan: { id: 'later', startTime: day(5), endTime: day(9) } }],
        }),
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(future.outOnLoan).toBe(false);

    const [past] = boxContents(
      box(
        content({
          reservations: [{ loan: { id: 'earlier', startTime: day(-9), endTime: day(-5) } }],
        }),
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(past.outOnLoan).toBe(false);
  });

  it('reads serialized dates, which is how the page hands them over', () => {
    const [vasara] = boxContents(
      box(
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
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(vasara.outOnLoan).toBe(true);
  });

  it('carries per-content return progress through when given it', () => {
    const pakki = box(content({ id: 'vasara', amount: 3 }));
    const [vasara] = boxContents(pakki, 'box-loan', [
      { itemId: 'vasara', returnedAmount: 1, missingAmount: 2 },
    ]);
    expect(vasara).toMatchObject({ returnedAmount: 1, missingAmount: 2 });
  });

  it('defaults progress to zero for a box that was never partially returned', () => {
    const [vasara] = boxContents(box(content()), 'box-loan');
    expect(vasara).toMatchObject({ returnedAmount: 0, missingAmount: 0 });
  });

  it('carries the name and amount through, and copes with no box at all', () => {
    expect(boxContents(undefined, 'box-loan', [], NOW)).toEqual([]);
    expect(boxContents(box(content({ amount: 666 })), 'box-loan', [], NOW)[0]).toMatchObject({
      id: 'vasara',
      name: 'Vasara',
      amount: 666,
    });
  });
});

describe('outstandingBoxContents', () => {
  const meisselit = box(content({ id: 'meisseli', name: 'Ristipäämeisseli', amount: 3 }));

  it('leaves the remainder after a part is returned and a part reported missing', () => {
    const [row] = outstandingBoxContents(
      meisselit,
      'box-loan',
      [{ itemId: 'meisseli', returnedAmount: 1, missingAmount: 1 }],
      NOW,
    );
    expect(row).toMatchObject({ id: 'meisseli', remaining: 1, returnedAmount: 1, missingAmount: 1 });
  });

  it('drops a content once every unit is accounted for', () => {
    expect(
      outstandingBoxContents(
        meisselit,
        'box-loan',
        [{ itemId: 'meisseli', returnedAmount: 2, missingAmount: 1 }],
        NOW,
      ),
    ).toEqual([]);
  });

  it('asks about the whole amount when nothing has been handed back yet', () => {
    const [row] = outstandingBoxContents(meisselit, 'box-loan', [], NOW);
    expect(row.remaining).toBe(3);
  });

  it('keeps a content out on another loan, greyed, with no remaining of its own', () => {
    const [row] = outstandingBoxContents(
      box(
        content({
          reservations: [{ loan: { id: 'other-loan', startTime: day(-2), endTime: day(2) } }],
        }),
      ),
      'box-loan',
      [],
      NOW,
    );
    expect(row).toMatchObject({ outOnLoan: true, remaining: 1 });
  });

  it('never goes negative on a stale over-count', () => {
    const [row] = outstandingBoxContents(
      box(content({ amount: 1 })),
      'box-loan',
      [{ itemId: 'vasara', returnedAmount: 5, missingAmount: 0 }],
      NOW,
    );
    // Fully accounted → filtered out; the floor keeps it from re-appearing.
    expect(row).toBeUndefined();
  });
});
