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

    const { announcement } = req.body;

    console.log('Creating announcement:', announcement);

    const createdAnnouncement = await prisma.announcement.create({
      data: {
        message: announcement.message,
        itemId: announcement.itemId,
      },
    });

    res.status(200).json({ createdAnnouncement });
  } catch (error) {
    console.error('Virhe luotaessa ilmoitusta:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
