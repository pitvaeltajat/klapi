'use client';

import React from 'react';
import { LoanStatus } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateOnly } from '@/utils/dateFormat';

interface Reservation {
  id: string;
  itemId: string;
  amount: number;
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
export default function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Määrä</TableHead>
          <TableHead>Nouto</TableHead>
          <TableHead>Palautus</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...reservations].sort((a, b) => new Date(b.loan.startTime).getTime() - new Date(a.loan.startTime).getTime()).map((reservation) => (
          <TableRow key={reservation.id}>
            <TableCell>{reservation.amount}</TableCell>
            <TableCell>{formatDateOnly(reservation.loan.startTime)}</TableCell>
            <TableCell>{formatDateOnly(reservation.loan.endTime)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
