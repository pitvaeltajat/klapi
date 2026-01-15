import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getServerSession(req, res, authOptions);
    if (session?.user?.group !== 'ADMIN') {
        res.status(401).json({
            message: 'Sinulla ei ole oikeutta tähän toimintoon',
        });
        return;
    }

    const boxes = await prisma.box.findMany({
        include: {
            loans: {
                select: {
                    id: true,
                    status: true,
                    description: true,
                    startTime: true,
                    endTime: true,
                    loaner: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    reservations: {
                        include: {
                            item: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    res.status(200).json(boxes);
}
