'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/utils/dateFormat';
import { getReservationStatusColor, getReservationStatusLabel } from '@/utils/loanHelpers';

interface Reservation {
  id: string;
  itemId: string;
  amount: number;
  status: ReservationStatus;
  loanId: string;
  loan: {
    id: string;
    description: string | null;
    status: LoanStatus;
    startTime: Date | string;
    endTime: Date | string;
    userId: string;
  };
  item: {
    name: string;
  };
}

// Rendered on a single item's detail page, so every row is the same item —
// no "Tuote" column needed (it was redundant and crowded the table on mobile).
// Admins additionally get a per-row link to the loan the reservation belongs to.
//
// Both past and upcoming bookings live in this one table, split by today's date
// so the cutoff is explicit: upcoming soonest-first on top, then a "Menneet"
// divider, then history newest-first.
export default function ReservationTable({
  reservations,
  isAdmin = false,
}: {
  reservations: Reservation[];
  isAdmin?: boolean;
}) {
  // Capture "now" once on mount — reading the clock during render is impure
  // (react-hooks/purity) and would re-shuffle the split on every re-render.
  const [nowMs] = useState(() => Date.now());

  const { upcoming, past } = useMemo(() => {
    const todayStart = new Date(nowMs);
    todayStart.setHours(0, 0, 0, 0);
    const cutoff = todayStart.getTime();

    const ahead: Reservation[] = [];
    const behind: Reservation[] = [];
    for (const reservation of reservations) {
      if (new Date(reservation.loan.endTime).getTime() >= cutoff) {
        ahead.push(reservation);
      } else {
        behind.push(reservation);
      }
    }

    const byStart = (a: Reservation, b: Reservation) =>
      new Date(a.loan.startTime).getTime() - new Date(b.loan.startTime).getTime();

    return {
      upcoming: ahead.sort(byStart),
      past: behind.sort((a, b) => byStart(b, a)),
    };
  }, [reservations, nowMs]);

  const columnCount = isAdmin ? 5 : 4;

  const groupRow = (label: string) => (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={columnCount}
        className="bg-muted py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </TableCell>
    </TableRow>
  );

  const row = (reservation: Reservation) => {
    const start = new Date(reservation.loan.startTime).getTime();
    const end = new Date(reservation.loan.endTime).getTime();
    const ongoing = start <= nowMs && end >= nowMs;

    return (
      <TableRow key={reservation.id} className={cn(ongoing && 'bg-warning/10')}>
        <TableCell>{reservation.amount}</TableCell>
        <TableCell>{formatDateOnly(reservation.loan.startTime)}</TableCell>
        <TableCell>{formatDateOnly(reservation.loan.endTime)}</TableCell>
        <TableCell>
          <Badge variant={getReservationStatusColor(reservation.status)}>
            {getReservationStatusLabel(reservation.status)}
          </Badge>
        </TableCell>
        {isAdmin && (
          <TableCell>
            <Link
              href={`/loan/${reservation.loan.id}`}
              className="font-medium text-primary hover:underline"
            >
              Avaa
            </Link>
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Määrä</TableHead>
          <TableHead>Nouto</TableHead>
          <TableHead>Palautus</TableHead>
          <TableHead>Tila</TableHead>
          {isAdmin && <TableHead>Laina</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {groupRow('Tulevat ja käynnissä')}
        {upcoming.length > 0 ? (
          upcoming.map(row)
        ) : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="text-sm text-muted-foreground">
              Ei tulevia varauksia.
            </TableCell>
          </TableRow>
        )}
        {groupRow('Menneet')}
        {past.length > 0 ? (
          past.map(row)
        ) : (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="text-sm text-muted-foreground">
              Ei aiempia lainoja.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
