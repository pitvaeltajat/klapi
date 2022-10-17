import prisma from '/utils/prisma';

require('dotenv').config();

export default async function handler(req, res) {
    try {
        const { reservations, startTime, endTime, userId, description } =
            req.body;

        const userName = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true },
        }).name;

        const userEmail = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        }).email;

        const result = await prisma.Loan.create({
            data: {
                reservations: { create: reservations },
                startTime: startTime,
                endTime: endTime,
                user: { connect: { id: userId } },
                description,
            },
        });

        await fetch(
            `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToUser`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: result.id,
                    email: userEmail,
                }),
            }
        );

        await fetch(
            `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToAdmin`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: result.id,
                    loanCreator: userName,
                }),
            }
        );

        res.status(200).json(result);
    } catch (err) {
        res.json({
            err: err.message,
        });
        return;
    }
}
