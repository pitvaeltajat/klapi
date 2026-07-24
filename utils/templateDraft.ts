const fiCollator = new Intl.Collator('fi');

/** One editable row in the "tallenna pohjaksi" dialog. */
export interface TemplateDraftItem {
  itemId: string;
  name: string;
  amount: number;
  /** Total units in storage — the ceiling for the row's stepper. */
  stock: number;
}

/** The reservation shape this needs; a subset of the Prisma row. */
interface DraftSourceReservation {
  itemId: string;
  amount: number;
  status: string;
  item: { name: string; amount: number; deletedAt: Date | string | null; type: string };
}

/**
 * Collapses a loan's reservations into the rows the "tallenna pohjaksi" dialog
 * starts from. Amounts are summed per item id (a loan can hold several
 * reservations for the same kama after an edit or a partial return), and names
 * are ignored as keys because they're non-unique free text.
 *
 * Rejected lines and non-loanable items are dropped for the same reasons
 * `createTemplate` would refuse them: an archived item would render as a ghost
 * row in the picker, and a temporary item is the one-off placeholder
 * `submitLoan` mints for a "kamaa ei löydy" request — reusing one would hand
 * every future loaner the same throwaway.
 */
export function templateDraftItemsFromLoan(
  reservations: DraftSourceReservation[],
): TemplateDraftItem[] {
  const byItemId = new Map<string, TemplateDraftItem>();

  for (const reservation of reservations) {
    if (reservation.status === 'REJECTED') continue;
    if (reservation.item.deletedAt || reservation.item.type !== 'normal') continue;

    const existing = byItemId.get(reservation.itemId);
    if (existing) existing.amount += reservation.amount;
    else
      byItemId.set(reservation.itemId, {
        itemId: reservation.itemId,
        name: reservation.item.name,
        amount: reservation.amount,
        stock: reservation.item.amount,
      });
  }

  return [...byItemId.values()]
    // A set can't suggest more than exists — stock may have shrunk since the
    // loan was made, and the stepper's ceiling has to hold for the seed too.
    .map((row) => ({ ...row, amount: Math.max(1, Math.min(row.amount, row.stock)) }))
    .sort((a, b) => fiCollator.compare(a.name, b.name));
}
