import prisma from '/utils/prisma';

import { Stack, Box, Button, Heading } from '@chakra-ui/react';
import Link from '../../components/Link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';

export async function getServerSideProps() {
    const loans = await prisma.loan.findMany({
        include: {
            user: true,
        },
    });

    return { props: { loans } };
}

export const LoanCard = ({ loan }) => {
    const getColor = (status) => {
        if (status === 'PENDING') {
            return 'yellow.300';
        } else if (status === 'APPROVED') {
            return 'green.400';
        } else if (status === 'REJECTED') {
            return 'pink.300';
        }
    };

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
    const { data: session } = useSession();

    if (session?.user?.group !== 'ADMIN') {
        return <NotAuthenticated />;
    }

    if (loans.length === 0) {
        return (
            <Box>
                <Heading>Ei varauksia</Heading>
                <Link href='/'>
                    <Button>Luo varaus etusivulla</Button>
                </Link>
            </Box>
        );
    }

    return (
        <Stack spacing={5}>
            {loans.map((loan) => (
                <LoanCard key={loan.id} loan={loan} />
            ))}
        </Stack>
    );
}
