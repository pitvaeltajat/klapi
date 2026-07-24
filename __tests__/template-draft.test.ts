/**
 * Unit tests for the loan → "tallenna pohjaksi" derivation. This used to live
 * server-side in `templateItemsFromLoan`; it moved client-side so the admin can
 * edit the rows before the set is created, but the filtering rules it has to
 * mirror (what `createTemplate` would refuse) are unchanged.
 */

import { describe, it, expect } from 'vitest';
import { templateDraftItemsFromLoan } from '@/utils/templateDraft';

const reservation = (
  itemId: string,
  amount: number,
  overrides: {
    status?: string;
    name?: string;
    stock?: number;
    deletedAt?: Date | null;
    type?: string;
  } = {},
) => ({
  itemId,
  amount,
  status: overrides.status ?? 'ACCEPTED',
  item: {
    name: overrides.name ?? itemId,
    amount: overrides.stock ?? 10,
    deletedAt: overrides.deletedAt ?? null,
    type: overrides.type ?? 'normal',
  },
});

describe('templateDraftItemsFromLoan', () => {
  it('sums repeated reservations for the same item', () => {
    const rows = templateDraftItemsFromLoan([
      reservation('tent', 2),
      reservation('tent', 1),
      reservation('stove', 1),
    ]);

    expect(rows).toEqual([
      { itemId: 'stove', name: 'stove', amount: 1, stock: 10 },
      { itemId: 'tent', name: 'tent', amount: 3, stock: 10 },
    ]);
  });

  it('keys on item id, not name — names are non-unique free text', () => {
    const rows = templateDraftItemsFromLoan([
      reservation('axe-a', 1, { name: 'Kirves' }),
      reservation('axe-b', 1, { name: 'Kirves' }),
    ]);

    expect(rows.map((row) => row.itemId)).toEqual(['axe-a', 'axe-b']);
  });

  it('skips rejected lines and temporary and archived items', () => {
    const rows = templateDraftItemsFromLoan([
      reservation('tent', 1),
      reservation('stove', 1, { status: 'REJECTED' }),
      reservation('temp', 1, { type: 'temporary' }),
      reservation('axe', 1, { deletedAt: new Date() }),
    ]);

    expect(rows).toEqual([{ itemId: 'tent', name: 'tent', amount: 1, stock: 10 }]);
  });

  it('clamps the suggested amount to what is in storage', () => {
    const rows = templateDraftItemsFromLoan([reservation('tent', 6, { stock: 4 })]);

    expect(rows[0].amount).toBe(4);
  });

  it('sorts by name the Finnish way', () => {
    const rows = templateDraftItemsFromLoan([
      reservation('a', 1, { name: 'Ätkä' }),
      reservation('b', 1, { name: 'Zulu' }),
      reservation('c', 1, { name: 'Astia' }),
    ]);

    expect(rows.map((row) => row.name)).toEqual(['Astia', 'Zulu', 'Ätkä']);
  });
});
