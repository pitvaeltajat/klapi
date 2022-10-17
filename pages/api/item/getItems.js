import prisma from '/utils/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
    const session = await getSession({ req });

    const items = await prisma.item.findMany({
        include: {
            categories: true,
            reservations: { include: { loan: true } },
        },
    });
    if (session) {
        res.status(200).json(items);
    } else {
        res.status(401).json({ message: 'Unauthorized' });
    }
}
