import prisma from '../../../utils/prisma';
import { ReservationStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { itemIds } = req.body;

  if (!itemIds || !Array.isArray(itemIds)) {
    return res.status(400).json({ message: 'itemIds array is required' });
  }

  // Find all reservations with IN_BOX status for the given items
  const inBoxReservations = await prisma.reservation.findMany({
    where: {
      itemId: { in: itemIds },
      status: ReservationStatus.IN_BOX,
    },
    include: {
      item: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Get unique items that are in boxes
  const inBoxItemsMap = new Map<string, { itemId: string; itemName: string }>();
  for (const reservation of inBoxReservations) {
    if (!inBoxItemsMap.has(reservation.itemId)) {
      inBoxItemsMap.set(reservation.itemId, {
        itemId: reservation.item.id,
        itemName: reservation.item.name,
      });
    }
  }

  res.status(200).json({
    inBoxItems: Array.from(inBoxItemsMap.values()),
  });
}
