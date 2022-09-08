import prisma from '/utils/prisma';
import { getSession } from 'next-auth/react';

require('dotenv').config();

export default async function handler(req, res) {
    const session = await getSession({ req });
    if (session?.user?.group !== 'ADMIN') {
        res.status(401).json({
            message: 'Sinulla ei ole oikeutta tähän toimintoon',
        });
    }

    const { reservations, startTime, endTime, userName, description } =
        req.body;
    try {
        const user_id = await prisma.user.findMany({
            where: { name: { contains: userName } },
            select: { id: true },
        });

        const user_email = await prisma.user.findMany({
            where: { name: { contains: userName } },
            select: { email: true },
        });

        const userEmail = user_email[0].email;
        const userId = user_id[0]['id'];

        const result = await prisma.Loan.create({
            data: {
                reservations: { create: reservations },
                startTime: startTime,
                endTime: endTime,
                user: { connect: { id: userId } },
                description,
            },
        });

        await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToUser`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: result.id,
                email: userEmail,
            }),
        });

        await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToAdmin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: result.id,
                loanCreator: userName,
            }),
        });

        res.status(200).json(result);
    } catch (err) {
        res.json({
            err: err.message,
        });
    }
}
