import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!(session?.user.group === 'ADMIN')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: 'Bad Request' });
  }

  if (!/^\d{4}$/.test(pin)) {
    return res.status(400).json({ message: 'Invalid PIN format' });
  }

  const user = await prisma.user.updateMany({
    where: { group: 'KIOSK' },
    data: {
      kioskElevatePin: await bcrypt.hash(pin, 10),
    },
  });

  res.status(200).json({ message: 'Success' });
}
