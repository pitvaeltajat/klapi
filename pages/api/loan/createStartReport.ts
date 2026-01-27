import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import prisma from '../../../utils/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    res.status(401).json({ message: 'Kirjaudu sisään' });
    return;
  }

  const { loanId, content } = req.body;
  if (!loanId || !content) {
    res.status(400).json({ message: 'loanId ja content vaaditaan' });
    return;
  }

  try {
    const report = await prisma.report.create({
      data: {
        loanId,
        content,
        created: 'BEFORE_LOAN',
      },
    });
    res.status(200).json(report);
  } catch (error) {
    res.status(500).json({ message: 'Raportin tallennus epäonnistui' });
  }
}
