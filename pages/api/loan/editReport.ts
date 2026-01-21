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

    const { id, status, affectedItems } = req.body;

    const report = await prisma.report.update({
      where: {
        id: id,
      },
      data: {
        status: status,
      },
    });

    let affected = null;
    // affectedItems is an object: { [itemId]: amount }
    if (
      affectedItems &&
      typeof affectedItems === 'object' &&
      Object.keys(affectedItems).length > 0
    ) {
      // Remove previous affected items for this report
      await prisma.reportAffectedItem.deleteMany({ where: { reportId: report.id } });
      // Convert to array for DB insert
      const affectedArray = Object.entries(affectedItems)
        .filter(([, amount]) => Number(amount) > 0)
        .map(([itemId, amount]) => ({ reportId: report.id, itemId, amount: Number(amount) }));
      if (affectedArray.length > 0) {
        affected = await prisma.reportAffectedItem.createMany({ data: affectedArray });
      }
    }

    res.status(200).json({ report, affected });
  } catch (error) {
    console.error('Virhe muokattaessa raporttia:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
