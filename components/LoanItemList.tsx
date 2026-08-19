'use client';

import React from 'react';
import NextLink from 'next/link';
import { ReservationStatus } from '@prisma/client';
import { getReservationStatusLabel, getReservationStatusColor } from '@/utils/loanHelpers';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { SelectableRow } from '@/components/ui/selectable-row';
import ItemThumb from '@/components/ItemThumb';

export interface LoanItemRow {
  id: string;
  itemId: string;
  amount: number;
  status: ReservationStatus;
  item: { name: string };
}

export interface LoanItemSelection {
  /** Only these rows get a checkbox; the rest render as plain rows. */
  isSelectable: (reservation: LoanItemRow) => boolean;
  selected: Set<string>;
  onToggle: (id: string) => void;
}

function RowBody({ reservation }: { reservation: LoanItemRow }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <ItemThumb itemId={reservation.itemId} alt="" className="h-10 w-10 rounded border border-border" />
      <div className="min-w-0 flex-1">
        <NextLink
          href={`/item/${reservation.itemId}`}
          // Inside a SelectableRow the row is a <label>: without this the click
          // both navigates and ticks the checkbox.
          onClick={(e) => e.stopPropagation()}
          className="font-medium break-words text-primary hover:underline"
        >
          {reservation.item.name}
        </NextLink>
        <p className="text-sm text-muted-foreground">{reservation.amount} kpl</p>
      </div>
      <Badge variant={getReservationStatusColor(reservation.status)}>
        {getReservationStatusLabel(reservation.status)}
      </Badge>
    </div>
  );
}

/**
 * The loan's items as one list — thumbnail, name, amount, status. When
 * `selection` is passed the eligible rows become tickable in place, so
 * "merkitse palautetuksi" happens on the same list the loan is read from
 * instead of a second copy of it further down the page.
 */
export default function LoanItemList({
  reservations,
  selection,
}: {
  reservations: LoanItemRow[];
  selection?: LoanItemSelection;
}) {
  if (reservations.length === 0) {
    return <EmptyState variant="inline" title="Ei tavaroita." />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {reservations.map((r) => (
        <li key={r.id}>
          {selection?.isSelectable(r) ? (
            <SelectableRow
              selected={selection.selected.has(r.id)}
              onSelectedChange={() => selection.onToggle(r.id)}
            >
              <RowBody reservation={r} />
            </SelectableRow>
          ) : (
            <Card variant="inset" padding="sm" className="flex items-center gap-3">
              {/* Keeps the un-tickable rows lined up with the tickable ones. */}
              {selection && <span aria-hidden className="size-4 shrink-0" />}
              <RowBody reservation={r} />
            </Card>
          )}
        </li>
      ))}
    </ul>
  );
}
