import { PrismaClient } from '@prisma/client';

import { Stack, Box, Button, Heading } from '@chakra-ui/react';
import Link from '../../components/Link';

export async function getServerSideProps() {
    const prisma = new PrismaClient();
    const loans = await prisma.loan.findMany({
        include: {
            user: true,
        },
    });

    return { props: { loans } };
}

const LoanCard = ({ loan }) => {
    return (
        <Box width='100%' key={loan.id}>
            <Heading as='h3' size='md'>
                {loan.id}
            </Heading>
            <Box
                display='flex'
                flexDirection='row'
                justifyContent='space-between'
            >
                <Stack spacing='5px'>
                    <p>Alkaa: {loan.startTime.toLocaleString('fi-FI')}</p>
                    <p>Loppuu: {loan.endTime.toLocaleString('fi-FI')}</p>
                    <p>Varaaja: {loan.user.name}</p>
                </Stack>
                <Link href={`/loans/${loan.id}`}>
                    <Button>Tarkastele</Button>
                </Link>
            </Box>
        </Box>
    );
};

export default function Loans({ loans }) {
    return (
        <Stack>
            {loans.map((loan) => (
                <LoanCard loan={loan} />
            ))}
        </Stack>
    );
}
