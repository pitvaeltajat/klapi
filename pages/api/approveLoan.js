import { LoanStatus, PrismaClient } from '@prisma/client';

export default async function handler(req, res) {
    const { id } = req.body;
    const result = await prisma.Loan.update({
        where: { id: id },
        data: {
            status: LoanStatus.ACCEPTED,
        },
    });
    res.status(200).json(result);
}
