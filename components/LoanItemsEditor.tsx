'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import CustomItemDialog from '@/components/CustomItemDialog';
import ItemAmountCard from '@/components/ItemAmountCard';
import { Alert } from '@/components/ui/alert';
import { CreatableSelect } from '@/components/ui/creatable-select';
import { EmptyState } from '@/components/ui/empty-state';
import { isCustomItemId } from '@/utils/customItems';
import { cn } from '@/lib/utils';

/**
 * One row of the loan being edited — one kama, whatever it is made of. The
 * reservation rows the loan arrived with, the catalogue kamat added here and
 * the loaner's own kamat all reduce to this, so the list has a single shape.
 *
 * Keyed by `itemId` rather than reservation id: two rows of the same kama have
 * no meaning (`updateLoan` sums them by item anyway), so adding one that is
 * already in the list bumps its amount instead of starting a second row.
 *
 * Shared by the loan edit page and the kiosk's "Muokkaa kamoja" dialog, which
 * had drifted into two different editors for the same list.
 */
export interface LoanItemRow {
  itemId: string;
  name: string;
  amount: number;
}

export const rowsFromReservations = (
  reservations: { amount: number; item: { id: string; name: string } }[],
): LoanItemRow[] => {
  const byItem = new Map<string, LoanItemRow>();
  for (const r of reservations) {
    const existing = byItem.get(r.item.id);
    if (existing) existing.amount += r.amount;
    else byItem.set(r.item.id, { itemId: r.item.id, name: r.item.name, amount: r.amount });
  }
  return Array.from(byItem.values());
};

/** The `updateLoan` body's `reservations` for a list of rows. */
export const rowsToReservations = (rows: LoanItemRow[]) =>
  rows.map((r) => ({
    amount: r.amount,
    item: { connect: { id: r.itemId } },
    // Only an oma kama carries a name: it is what updateLoan creates the
    // temporary item from.
    ...(isCustomItemId(r.itemId) ? { name: r.name } : {}),
  }));

export function useLoanItemRows(
  originalRows: LoanItemRow[],
  availabilities: Record<string, { available: number }> | null,
) {
  const originalAmounts = useMemo(
    () => new Map(originalRows.map((r) => [r.itemId, r.amount])),
    [originalRows],
  );
  const [rows, setRows] = useState<LoanItemRow[]>(originalRows);

  /**
   * How many of a kama this loan may hold. `getAvailabilities` counts every
   * overlapping reservation including this loan's own, so what the loan already
   * booked has to be added back or editing a full loan would look impossible.
   */
  const headroom = (itemId: string): number => {
    if (isCustomItemId(itemId)) return Number.MAX_SAFE_INTEGER;
    const free = availabilities?.[itemId]?.available ?? 0;
    return free + (originalAmounts.get(itemId) ?? 0);
  };

  const dirty =
    rows.length !== originalRows.length ||
    rows.some((r) => originalAmounts.get(r.itemId) !== r.amount);

  return {
    rows,
    setRows,
    originalAmounts,
    headroom,
    dirty,
    overBooked: rows.filter((r) => r.amount > headroom(r.itemId)),
    reset: () => setRows(originalRows),
  };
}

type Editor = ReturnType<typeof useLoanItemRows>;

export function LoanItemRows({ editor, className }: { editor: Editor; className?: string }) {
  const { rows, setRows, originalAmounts, headroom, overBooked } = editor;

  const setAmount = (itemId: string, amount: number) =>
    setRows((current) => current.map((r) => (r.itemId === itemId ? { ...r, amount } : r)));

  return (
    <>
      {overBooked.length > 0 && (
        <Alert variant="warning" title="Osa kamoista ei mahdu valitulle ajalle" className="mb-3">
          Pienennä alla merkittyjen kamojen määriä, muuten tallennus estetään.
        </Alert>
      )}

      {rows.length === 0 ? (
        <EmptyState variant="inline" title="Ei kamoja" />
      ) : (
        <div className={cn('grid grid-cols-1 gap-2', className)}>
          {rows.map((row) => {
            const original = originalAmounts.get(row.itemId);
            const max = headroom(row.itemId);
            return (
              <ItemAmountCard
                key={row.itemId}
                itemId={row.itemId}
                name={row.name}
                amount={row.amount}
                subtitle={
                  isCustomItemId(row.itemId) ? (
                    'Oma kama'
                  ) : original === undefined ? (
                    <span className="text-success">Uusi · vapaana {max}</span>
                  ) : original !== row.amount ? (
                    <span className="text-warning">
                      Oli {original} kpl · vapaana {max}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Vapaana {max}</span>
                  )
                }
                decrementDisabled={row.amount <= 1}
                incrementDisabled={row.amount >= max}
                onDecrement={() => setAmount(row.itemId, row.amount - 1)}
                onIncrement={() => setAmount(row.itemId, row.amount + 1)}
                onAmountChange={(next) => setAmount(row.itemId, Math.min(max, Math.max(1, next)))}
                onRemove={() =>
                  setRows((current) => current.filter((r) => r.itemId !== row.itemId))
                }
                removeLabel={`Poista ${row.name} lainasta`}
              />
            );
          })}
        </div>
      )}
    </>
  );
}

export function AddLoanItemPicker({
  editor,
  items,
}: {
  editor: Editor;
  items: { id: string; name: string }[];
}) {
  const { rows, setRows, headroom } = editor;
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState('');

  const addRow = (row: LoanItemRow) =>
    setRows((current) => {
      const existing = current.find((r) => r.itemId === row.itemId);
      if (!existing) return [...current, row];
      return current.map((r) =>
        r.itemId === row.itemId ? { ...r, amount: r.amount + row.amount } : r,
      );
    });

  /** What's still free to add on top of what the loan already holds. */
  const remaining = (itemId: string) =>
    headroom(itemId) - (rows.find((r) => r.itemId === itemId)?.amount ?? 0);

  return (
    <>
      <CustomItemDialog
        key={customName}
        isOpen={customOpen}
        onClose={() => setCustomOpen(false)}
        initialName={customName}
        onAdd={({ id, name, amount }) => addRow({ itemId: id, name, amount })}
        title="Lisää oma kama lainaan"
        successMessage="Lisätty lainaan"
        submitIcon={Plus}
      />
      {/* Searchable: the catalogue is long enough that a native select means
          scrolling past a hundred kamaa to find one. A name with no match isn't
          a dead end — it offers to become an oma kama. The amount isn't asked
          for here; the row above adjusts it. */}
      <CreatableSelect<{ value: string; label: string }>
        value={null}
        options={items.map((i) => ({ value: i.id, label: i.name }))}
        // A kama the loan already holds every one of can't be added again.
        // The "create" row isn't a catalogue kama, so it is never blocked.
        isOptionDisabled={(option) =>
          items.some((i) => i.id === option.value) && remaining(option.value) < 1
        }
        onChange={(option) => {
          const item = items.find((i) => i.id === option?.value);
          if (item) addRow({ itemId: item.id, name: item.name, amount: 1 });
        }}
        onCreateOption={(name) => {
          setCustomName(name);
          setCustomOpen(true);
        }}
        formatCreateLabel={(input) => `Lisää oma kama "${input}"`}
        placeholder="Hae kamaa nimellä"
        noOptionsMessage={() => 'Ei osumia'}
      />
    </>
  );
}
