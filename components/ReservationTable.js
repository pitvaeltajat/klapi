import React from 'react';

import {
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
    Link,
    Button,
} from '@chakra-ui/react';

const DateTimeToString = (date) => {
    return date.toLocaleString('fi-FI');
};

export default function ReservationTable({ reservations }) {
    return (
        <Table>
            <TableContainer>
                <Thead>
                    <Tr>
                        <Th>Alku</Th>
                        <Th>Loppu</Th>
                        <Th>Määrä</Th>
                        <Th></Th>
                    </Tr>
                </Thead>
                <Tbody>
                    {reservations.map((reservation) => {
                        const loan = reservation.loan;
                        return (
                            <Tr>
                                <Td>{DateTimeToString(loan.startTime)}</Td>
                                <Td>{DateTimeToString(loan.endTime)}</Td>
                                <Td>{reservation.amount}</Td>
                                <Td>
                                    <Link href={'/loan/' + loan.id}>
                                        <Button>Muokkaa</Button>
                                    </Link>
                                </Td>
                            </Tr>
                        );
                    })}
                </Tbody>
            </TableContainer>
        </Table>
    );
}
