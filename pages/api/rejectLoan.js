import { LoanStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
    const { id } = req.body;
    const result = await prisma.Loan.update({
        where: { id: id },
        data: {
            status: LoanStatus.REJECTED,
        },
    });
    res.status(200).json(result);
}
