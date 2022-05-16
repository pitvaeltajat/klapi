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

export default function ReservationTable({ reservations }) {
    return (
        <TableContainer>
            <Table>
                <Thead>
                    <Tr>
                        <Th>Nimi</Th>
                        <Th>Alku</Th>
                        <Th>Loppu</Th>
                        <Th>Määrä</Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {reservations.map((reservation) => {
                        return (
                            <Tr key={reservation.id}>
                                <Td>
                                    <Link href={`/loan/${reservation.loan.id}`}>
                                        {reservation.description ||
                                            'Nimetön varaus'}
                                    </Link>
                                </Td>
                                <Td>
                                    {DateTimeToString(
                                        reservation.loan.startTime
                                    )}
                                </Td>
                                <Td>
                                    {DateTimeToString(reservation.loan.endTime)}
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
