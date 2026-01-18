import React from 'react';

import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Link, Tag } from '@chakra-ui/react';

import NextLink from 'next/link';
import { ReservationStatus } from '@prisma/client';
import { getReservationStatusLabel, getReservationStatusColor } from '../utils/loanHelpers';

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
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Tuote</Th>
            <Th>Määrä</Th>
            <Th>Tila</Th>
          </Tr>
        </Thead>
        <Tbody>
          {loan.reservations.map((reservation) => {
            return (
              <Tr key={reservation.id}>
                <Td>
                  <Link as={NextLink} href={`/item/${reservation.itemId}`}>
                    {reservation.item.name}
                  </Link>
                </Td>
                <Td>{reservation.amount}</Td>
                <Td>
                  <Tag colorScheme={getReservationStatusColor(reservation.status)} size="sm">
                    {getReservationStatusLabel(reservation.status)}
                  </Tag>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
