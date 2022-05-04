import { PrismaClient } from '@prisma/client';

import { Box, Stack, Button, Link } from '@chakra-ui/react';

export async function getServerSideProps() {
    const prisma = new PrismaClient();
    const loans = await prisma.loan.findMany({
        include: {
            user: true,
        },
    });

    console.log(loans);
    return { props: { loans } };
}

const LoanCard = ({ loan }) => {
    return (
        <Box key={loan.id}>
            <p>{loan.startTime.toLocaleString('fi-FI')}</p>
            <p>{loan.endTime.toLocaleString('fi-FI')}</p>
            <p>{loan.user.name}</p>
            <Link href={`/loans/${loan.id}`}>
                <Button>Tarkastele</Button>
            </Link>
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
