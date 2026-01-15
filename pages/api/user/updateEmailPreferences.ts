import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);

  if (!session || !session.user?.id) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { emailWeeklyReminder, emailNewLoanNotification } = req.body;

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailWeeklyReminder: emailWeeklyReminder !== undefined ? emailWeeklyReminder : undefined,
        emailNewLoanNotification:
          emailNewLoanNotification !== undefined ? emailNewLoanNotification : undefined,
      },
    });

    res.status(200).json({
      message: 'Email preferences updated',
      emailWeeklyReminder: updatedUser.emailWeeklyReminder,
      emailNewLoanNotification: updatedUser.emailNewLoanNotification,
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
