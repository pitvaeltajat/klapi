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
    
    const items = await prisma.item.findMany({include: {
        categories: true,
        reservations: { include: { loan: true } },
    }});
    res.json(items);
}
