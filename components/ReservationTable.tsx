'use client';

import React from 'react';
import Link from 'next/link';
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
// Admins additionally get a per-row link to the loan the reservation belongs to.
export default function ReservationTable({
  reservations,
  isAdmin = false,
}: {
  reservations: Reservation[];
  isAdmin?: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Määrä</TableHead>
          <TableHead>Nouto</TableHead>
          <TableHead>Palautus</TableHead>
          {isAdmin && <TableHead>Laina</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...reservations].sort((a, b) => new Date(b.loan.startTime).getTime() - new Date(a.loan.startTime).getTime()).map((reservation) => (
          <TableRow key={reservation.id}>
            <TableCell>{reservation.amount}</TableCell>
            <TableCell>{formatDateOnly(reservation.loan.startTime)}</TableCell>
            <TableCell>{formatDateOnly(reservation.loan.endTime)}</TableCell>
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
        ))}
      </TableBody>
    </Table>
  );
}
