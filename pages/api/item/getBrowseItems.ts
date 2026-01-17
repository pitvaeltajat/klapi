import prisma from '../../../utils/prisma';
import { visibleItemsWhere } from '../../../utils/itemQueries';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const items = await prisma.item.findMany({
    where: visibleItemsWhere,
    include: {
      categories: true,
      location: true,
      reservations: { include: { loan: true } },
    },
  });

  const categories = await prisma.category.findMany({
    include: {
      items: true,
    },
  });

  res.status(200).json({ items, categories });
}
