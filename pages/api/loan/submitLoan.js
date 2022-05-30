import prisma from '/utils/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
    const session = await getSession({ req });
    console.log('session in API: ', session);
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
        res.status(200).json(result);
    } catch (err) {
        res.json({
            err: err.message,
        });
    }
}
