import { LoanStatus, PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';
import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const session = await getSession({ req });
    if (session?.user?.group !== 'ADMIN') {
        res.status(401).json({
            message: 'Sinulla ei ole oikeutta tähän toimintoon',
        });
    }

    const { id } = req.body;
    const Loan = await prisma.loan.findMany({
        where: { id: id },
        include: {
            user: true,
            reservations: {
                include: {
                    item: true,
                },
            },
        },
    });

    const result = await prisma.Loan.update({
        where: { id: id },
        data: {
            status: LoanStatus.ACCEPTED,
        },
    });
    res.status(200).json(result);
}
