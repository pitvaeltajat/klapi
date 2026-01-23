import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import 'dotenv/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user?.id) {
      res.status(401).json({ message: 'Ei kirjautunut sisään' });
      return;
    }

    if (session?.user?.group !== 'ADMIN') {
      res.status(403).json({ message: 'Ei oikeutta tähän toimintoon' });
      return;
    }

    const { id } = req.body;

    const expiredAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        expiresAt: new Date(),
      },
    });

    res.status(200).json({ expiredAnnouncement });
  } catch (error) {
    console.error('Virhe vanhennettaessa ilmoitusta:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
