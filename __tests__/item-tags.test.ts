import { describe, it, expect } from 'vitest';
import { inBoxSince, itemTags, itemWithAmount } from '../utils/loanHelpers';

const trangia = { id: 't', name: 'Trangia' };
const megafoni = { id: 'm', name: 'Megafoni' };

describe('itemWithAmount', () => {
  it('leaves a single kama unnumbered', () => {
    expect(itemWithAmount('Trangia', 1)).toBe('Trangia');
  });

  it('prefixes the amount when there is more than one', () => {
    expect(itemWithAmount('Trangia', 3)).toBe('3× Trangia');
  });
});

describe('itemTags', () => {
  it('merges the lines a partial return split, keeping first-seen order', () => {
    expect(
      itemTags([
        { amount: 2, item: trangia },
        { amount: 1, item: megafoni },
        { amount: 1, item: trangia },
      ]),
    ).toEqual([
      { id: 't', label: '3× Trangia' },
      { id: 'm', label: 'Megafoni' },
    ]);
  });
});

describe('inBoxSince', () => {
  const at = (day: number) => new Date(Date.UTC(2026, 9, day));
  const endTime = at(1);

  it('falls back to the end time with no return on record', () => {
    expect(inBoxSince([], endTime)).toEqual(endTime);
  });

  it('takes the first return since the box was last cleared', () => {
    expect(
      inBoxSince(
        [
          { action: 'RETURNED_TO_BOX', createdAt: at(12) },
          { action: 'RETURNED_TO_BOX', createdAt: at(3) },
          { action: 'PROCESSED_FROM_BOX', createdAt: at(4) },
          { action: 'RETURNED_TO_BOX', createdAt: at(10) },
        ],
        endTime,
      ),
    ).toEqual(at(10));
  });
});
