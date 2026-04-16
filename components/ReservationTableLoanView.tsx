'use client';

import React from 'react';
import NextLink from 'next/link';
import { ReservationStatus } from '@prisma/client';
import { getReservationStatusLabel, getReservationStatusColor } from '../utils/loanHelpers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Reservation {
  id: string;
  itemId: string;
  amount: number;
  status: ReservationStatus;
  item: {
    name: string;
  };
}

interface Loan {
  id: string;
  reservations: Reservation[];
}

export default function ReservationTableLoanView({ loan }: { loan: Loan }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tuote</TableHead>
          <TableHead>Määrä</TableHead>
          <TableHead>Tila</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loan.reservations.map((reservation) => (
          <TableRow key={reservation.id}>
            <TableCell>
              <NextLink href={`/item/${reservation.itemId}`} className="text-primary hover:underline">
                {reservation.item.name}
              </NextLink>
            </TableCell>
            <TableCell>{reservation.amount}</TableCell>
            <TableCell>
              <Badge variant={getReservationStatusColor(reservation.status)}>
                {getReservationStatusLabel(reservation.status)}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
