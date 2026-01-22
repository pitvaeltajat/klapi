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

    const { loanId, content } = req.body;

    const report = await prisma.report.create({
      data: {
        loanId: loanId,
        content: content,
      },
    });

    res.status(200).json({ report });
  } catch (error) {
    console.error('Virhe luotaessa raporttia:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
