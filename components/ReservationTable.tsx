import React from "react";

import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
} from "@chakra-ui/react";

import { useSession } from "next-auth/react";
import { LoanStatus } from "@prisma/client";

interface Reservation {
  id: string;
  itemId: string;
  amount: number;
  loanId: string;
  loan: {
    id: string;
    description: string | null;
    status: LoanStatus;
    startTime: Date;
    endTime: Date;
    userId: string;
  };
  item: {
    name: string;
  };
}

const DateTimeToString = (date: Date): string => {
  return new Date(date).toLocaleDateString("fi-FI");
};

export default function ReservationTable({
  reservations,
}: {
  reservations: Reservation[];
}) {
  const { data: session } = useSession();

  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            {session?.user?.group === "ADMIN" ? <Th>Tuote</Th> : null}
            <Th>Määrä</Th>
            <Th>Nouto</Th>
            <Th>Palautus</Th>
          </Tr>
        </Thead>
        <Tbody>
          {reservations.map((reservation) => {
            return (
              <Tr key={reservation.id}>
                {session?.user?.group === "ADMIN" ? (
                  <Td>{reservation.item.name}</Td>
                ) : null}
                <Td>{reservation.amount}</Td>
                <Td>{DateTimeToString(reservation.loan.startTime)}</Td>
                <Td>{DateTimeToString(reservation.loan.endTime)}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
