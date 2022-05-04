// single loan view
import React from 'react';
import { PrismaClient } from '@prisma/client';

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
    return <>loan basic view</>;
}
