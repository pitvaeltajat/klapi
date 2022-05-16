import prisma from '/utils/prisma';

import { Stack, Box, Button, Heading } from '@chakra-ui/react';
import Link from '../../components/Link';

export async function getServerSideProps() {
    const loans = await prisma.loan.findMany({
        include: {
            user: true,
        },
    });

    return { props: { loans } };
}

const LoanCard = ({ loan }) => {
    const getColor = (status) => {
        if (status === 'PENDING') {
            return 'yellow.300';
        } else if (status === 'APPROVED') {
            return 'green.400';
        } else if (status === 'REJECTED') {
            return 'pink.300';
        }
    };

    console.log(loan);

    return (
        <Link href={`/loan/${loan.id}`}>
            <Box width='100%' key={loan.id}>
                <Box
                    bgColor={getColor(loan.status)}
                    borderTopRadius='5px'
                    padding='2'
                >
                    <Heading as='h3' size='md'>
                        {loan.description || loan.user.name}
                    </Heading>
                    <p>{loan.status}</p>
                </Box>
                <Box
                    padding={2}
                    display='flex'
                    flexDirection='row'
                    justifyContent='space-between'
                    backgroundColor='gray.100'
                >
                    <Stack spacing='5px'>
                        <p>Alkaa: {loan.startTime.toLocaleString('fi-FI')}</p>
                        <p>Loppuu: {loan.endTime.toLocaleString('fi-FI')}</p>
                        <p>Varaaja: {loan.user.name}</p>
                    </Stack>
                </Box>
            </Box>
        </Link>
    );
};

export default function Loans({ loans }) {
    return (
        <Stack spacing={5}>
            {loans.map((loan) => (
                <LoanCard loan={loan} />
            ))}
        </Stack>
    );
}
