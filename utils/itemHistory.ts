import { ItemHistoryAction, Prisma } from '@prisma/client';
import prisma from './prisma';

/**
 * A field value we track in an item-history diff. Scalars cover name /
 * description / amount / location-name; the string[] covers category names.
 */
export type ItemFieldValue = string | number | null | string[];

/**
 * Records an item-history entry. Best-effort by design: a logging failure must
 * never break the mutation it accompanies, so errors are swallowed and logged
 * (mirrors `logLoanHistory`).
 */
export async function logItemHistory(params: {
  itemId: string;
  action: ItemHistoryAction;
  actedById?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const details = params.details ?? {};
    await prisma.itemHistory.create({
      data: {
        itemId: params.itemId,
        action: params.action,
        actedById: params.actedById ?? null,
        details:
          Object.keys(details).length > 0
            ? (details as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error('Failed to log item history:', err);
  }
}

function valuesEqual(a: ItemFieldValue, b: ItemFieldValue): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, i) => v === sb[i]);
  }
  return a === b;
}

/**
 * Builds a `{ field: { from, to } }` diff of changed fields, skipping unchanged
 * ones. Category lists are compared order-insensitively. Callers pass matching
 * keys in `before`/`after`; only keys present in `after` are considered.
 *
 * The returned object is stored as `details.changed` and rendered by
 * `formatItemHistoryChanges` (utils/itemHelpers).
 */
export function diffItemFields(
  before: Record<string, ItemFieldValue>,
  after: Record<string, ItemFieldValue>,
): Record<string, { from: ItemFieldValue; to: ItemFieldValue }> {
  const changed: Record<string, { from: ItemFieldValue; to: ItemFieldValue }> = {};
  for (const key of Object.keys(after)) {
    const from = before[key] ?? null;
    const to = after[key] ?? null;
    if (!valuesEqual(from, to)) changed[key] = { from, to };
  }
  return changed;
}
