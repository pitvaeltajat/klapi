import type { Prisma } from '@prisma/client';
import prisma from '@/utils/prisma';
import type { TemplateView } from '@/types';

/**
 * Server-side helpers for the loan templates. Imports Prisma — client
 * components want `TemplateView` from `@/types` instead.
 *
 * Items are soft-deleted (`deletedAt`), and a template that outlives one of its
 * items must not offer it: the row would render as a ghost in the picker and
 * `submitLoan` would reject it anyway. Archived items are therefore filtered
 * out of every template read rather than cascade-deleting the TemplateItem —
 * restoring the item brings it back to the template for free.
 */
export const templateItemsInclude = {
  items: {
    where: { item: { deletedAt: null } },
    include: { item: { select: { id: true, name: true, amount: true } } },
  },
} satisfies Prisma.TemplateInclude;

type TemplateWithItems = Prisma.TemplateGetPayload<{ include: typeof templateItemsInclude }>;

/** Flattens the join rows into the shape every consumer of this feature wants. */
export function toTemplateView(template: TemplateWithItems): TemplateView {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    items: template.items.map((entry) => ({
      itemId: entry.itemId,
      name: entry.item.name,
      amount: entry.amount,
      stock: entry.item.amount,
    })),
  };
}

export interface TemplateItemInput {
  itemId: string;
  amount: number;
}

/**
 * Validates a client-supplied item list: positive integer amounts and no
 * duplicate items (the `@@unique([templateId, itemId])` would blow up on
 * those). Returns null when the payload is malformed.
 */
export function normalizeTemplateItems(raw: unknown): TemplateItemInput[] | null {
  if (!Array.isArray(raw)) return null;
  const byItemId = new Map<string, number>();
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) return null;
    const { itemId, amount } = entry as { itemId?: unknown; amount?: unknown };
    if (typeof itemId !== 'string' || !itemId) return null;
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) return null;
    // Last write wins rather than erroring: a duplicated row in the admin form
    // is a slip, not an attack.
    byItemId.set(itemId, amount);
  }
  return [...byItemId].map(([itemId, amount]) => ({ itemId, amount }));
}

/**
 * True when every id is a live, normal item. Temporary items are the one-off
 * placeholders `submitLoan` creates for "kamaa ei löydy" requests — reusing one
 * in a template would hand every future loaner the same throwaway row. Without
 * this the unknown-id case would surface as a Prisma FK 500 instead of a 400.
 */
export async function allItemsLoanable(itemIds: string[]): Promise<boolean> {
  if (itemIds.length === 0) return true;
  const count = await prisma.item.count({
    where: { id: { in: itemIds }, deletedAt: null, type: 'normal' },
  });
  return count === itemIds.length;
}

/**
 * Collapses a loan's reservations into template rows — the "tallenna pohjaksi"
 * path. A loan can hold several reservations for the same item (an edit that
 * split a line, a partial return), so amounts are summed per item. Rejected
 * lines and non-loanable items are dropped for the same reasons as above.
 */
export async function templateItemsFromLoan(loanId: string): Promise<TemplateItemInput[]> {
  const reservations = await prisma.reservation.findMany({
    where: {
      loanId,
      status: { not: 'REJECTED' },
      item: { deletedAt: null, type: 'normal' },
    },
    select: { itemId: true, amount: true },
  });

  const byItemId = new Map<string, number>();
  for (const { itemId, amount } of reservations) {
    byItemId.set(itemId, (byItemId.get(itemId) ?? 0) + amount);
  }
  return [...byItemId].map(([itemId, amount]) => ({ itemId, amount }));
}
