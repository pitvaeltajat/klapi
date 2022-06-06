import { LoanStatus, PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
    const session = await getSession({ req });
    if (session?.user?.group !== 'ADMIN') {
        res.status(401).json({
            message: 'Sinulla ei ole oikeutta tähän toimintoon',
        });
    }

    const { id } = req.body;
    const result = await prisma.Loan.update({
        where: { id: id },
        data: {
            status: LoanStatus.ACCEPTED,
        },
    });
    res.status(200).json(result);
}
