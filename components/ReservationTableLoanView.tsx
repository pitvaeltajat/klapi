import React from "react";

import { Table, Link } from "@chakra-ui/react";

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

export default function ReservationTableLoanView({ loan }: { loan: Loan }) {
  return (
    <Table.ScrollArea>
      <Table.Root variant="line">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Tuote</Table.ColumnHeader>
            <Table.ColumnHeader>Määrä</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {loan.reservations.map((reservation) => {
            return (
              <Table.Row key={reservation.id}>
                <Table.Cell>
                  <NextLink href={`/item/${reservation.itemId}`} passHref legacyBehavior>
                    <Link>{reservation.item.name}</Link>
                  </NextLink>
                </Table.Cell>
                <Table.Cell>{reservation.amount}</Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  );
}
