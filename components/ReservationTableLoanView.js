import React from 'react';

import {
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    TableContainer,
} from '@chakra-ui/react';

import Link from './Link';

const DateTimeToString = (date) => {
    return date.toLocaleString('fi-FI');
};

export default function ReservationTableLoanView({ loan }) {
    return (
        <TableContainer>
            <Table>
                <Thead>
                    <Tr>
                        <Th>Nimi</Th>
                        <Th>Alku</Th>
                        <Th>Loppu</Th>
                        <Th>Määrä</Th>
                        <Th></Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {loan.reservations.map((reservation) => {
                        return (
                            <Tr key={reservation.id}>
                                <Td>
                                    <Link href={`/item/${reservation.item.id}`}>
                                        {reservation.item.name}
                                    </Link>
                                </Td>
                                <Td>{DateTimeToString(loan.startTime)}</Td>
                                <Td>{DateTimeToString(loan.endTime)}</Td>
                                <Td>{reservation.amount}</Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </Table>
        </TableContainer>
    );
}
