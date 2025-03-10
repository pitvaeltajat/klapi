import React from "react";

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Link,
} from "@chakra-ui/react";

import NextLink from "next/link";

interface Reservation {
  id: string;
  itemId: string;
  amount: number;
  item: {
    name: string;
  };
}

interface Loan {
  id: string;
  reservations: Reservation[];
}

const DateTimeToString = (date: Date): string => {
  return new Date(date).toLocaleDateString("fi-FI");
};

export default function ReservationTableLoanView({ loan }: { loan: Loan }) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Tuote</Th>
            <Th>Määrä</Th>
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
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
