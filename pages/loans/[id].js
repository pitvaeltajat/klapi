// single loan view
import React from 'react';
import { PrismaClient } from '@prisma/client';
import { Stack, Button } from '@chakra-ui/react';

export async function getServerSideProps(req, res) {
    const prisma = new PrismaClient();

    const loan = await prisma.loan.findUnique({
        where: {
            id: req.params.id,
        },
        include: {
            user: true,
            reservations: true,
        },
    });
    if (!loan) {
        return {
            notFound: true,
        };
    }
    return {
        props: {
            loan,
        },
    };
}
export default function LoanView({ loan }) {
    console.log(loan);
    // list reservations and show loan basic information and user information
    return (
        <Stack direction={'row'}>
            <Button colorScheme={'red'}>Hylkää</Button>
            <Button colorScheme={'yellow'}>Muokkaa</Button>
            <Button colorScheme={'green'}>Hyväksy</Button>
        </Stack>
    );
}
