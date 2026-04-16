'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { LoanStatus } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

const DateTimeToString = (date: Date | string): string => new Date(date).toLocaleDateString('fi-FI');

export default function ReservationTable({ reservations }: { reservations: Reservation[] }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.group === 'ADMIN';

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {isAdmin ? <TableHead>Tuote</TableHead> : null}
          <TableHead>Määrä</TableHead>
          <TableHead>Nouto</TableHead>
          <TableHead>Palautus</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {reservations.toReversed().map((reservation) => (
          <TableRow key={reservation.id}>
            {isAdmin ? <TableCell>{reservation.item.name}</TableCell> : null}
            <TableCell>{reservation.amount}</TableCell>
            <TableCell>{DateTimeToString(reservation.loan.startTime)}</TableCell>
            <TableCell>{DateTimeToString(reservation.loan.endTime)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
