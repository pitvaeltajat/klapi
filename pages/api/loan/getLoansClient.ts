import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== 'ADMIN') {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const loans = await prisma.loan.findMany({
    include: {
      user: true,
      reservations: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  res.status(200).json(loans);
}
