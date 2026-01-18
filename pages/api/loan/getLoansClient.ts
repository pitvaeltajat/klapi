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
  if (!session?.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const isAdminOrKiosk = session.user.group === 'ADMIN' || session.user.group === 'KIOSK';

  const loans = await prisma.loan.findMany({
    where: isAdminOrKiosk ? {} : { userId: session.user.id },
    include: {
      user: true,
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
  });

  res.status(200).json(loans);
}
