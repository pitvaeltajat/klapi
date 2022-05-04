import { LoanStatus, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handle(req, res) {
    const { loanId } = req.body;
    console.log(loanId);
    try {
        const result = await prisma.Loan.update({
            where: { id: loanId },
            data: {
                status: LoanStatus.ACCEPTED,
            },
        });
        res.status(200).json(result);
    } catch (err) {
        console.log(err);
        res.status(403).json({
            err: 'An error occured while approving a loan',
        });
    }
}
