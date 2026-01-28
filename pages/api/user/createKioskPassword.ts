import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '../../../utils/prisma/index.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const kioskUsers = await prisma.user.findMany({
      where: {
        group: 'KIOSK',
      },
    });

    if (kioskUsers.length === 0) {
      return res.status(404).json({ message: 'Kiosk user not found' });
    }

    const OTP = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await bcrypt.hash(OTP, 10);

    await prisma.user.updateMany({
      where: {
        group: 'KIOSK',
      },
      data: {
        password: hashedPassword,
        passwordExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
      },
    });

    res.status(200).json({
      message: 'Kiosk password created',
      kioskPassword: OTP,
    });
  } catch (error) {
    console.error('Error creating kiosk password:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await prisma.$disconnect();
  }
}
