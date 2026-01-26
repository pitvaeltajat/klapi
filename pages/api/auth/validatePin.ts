import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from './[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { pin, userId } = req.body;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kioskElevatePin: true },
  });

  if (!user || !user.kioskElevatePin) {
    return res.status(200).json({ isValidPin: false });
  }

  const isValidPin: boolean = await bcrypt.compare(pin, user.kioskElevatePin);

  res.status(200).json({ isValidPin });
}
