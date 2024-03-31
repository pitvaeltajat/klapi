import React from 'react';

import { Table, Thead, Tbody, Tr, Th, Td, TableContainer, Link } from '@chakra-ui/react';

import NextLink from 'next/link';
import { useSession } from 'next-auth/react';

const DateTimeToString = (date) => {
	return date.toLocaleString('fi-FI');
};

export default function ReservationTable({ reservations }) {
	const { data: session } = useSession();

	return (
		<TableContainer>
			<Table>
				<Thead>
					<Tr>
						{session?.user?.group === 'ADMIN' ? <Th>Varaaja</Th> : null}
						<Th>Alku</Th>
						<Th>Loppu</Th>
						<Th>Määrä</Th>
					</Tr>
				</Thead>
				<Tbody>
					{reservations.map((reservation) => {
						return (
							<Tr key={reservation.id}>
								{session?.user?.group === 'ADMIN' ? (
									<Td>
										<Link as={NextLink} href={`/loan/${reservation.loan.id}`}>
											{reservation.loan.user.name}
										</Link>
									</Td>
								) : null}
								<Td>{DateTimeToString(reservation.loan.startTime)}</Td>
								<Td>{DateTimeToString(reservation.loan.endTime)}</Td>
								<Td>{reservation.amount}</Td>
							</Tr>
						);
					})}
				</Tbody>
			</Table>
		</TableContainer>
	);
}
