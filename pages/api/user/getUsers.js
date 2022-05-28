import prisma from '/utils/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
    const session = await getSession({ req });
    console.log('session in API: ', session);
    if (session?.user?.group !== 'ADMIN') {
        res.status(401)
            .json({
                message: 'Sinulla ei ole oikeutta tähän toimintoon',
            })
            .end();
    }
    const users = await prisma.user.findMany();
    res.json(users);
}
