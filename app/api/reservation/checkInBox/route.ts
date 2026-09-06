import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { ReservationStatus } from '@prisma/client';
import { activeLoanReservationWhere } from '@/utils/loanQueries';

export async function POST(request: Request) {
  const { itemIds } = await request.json();

  if (!itemIds || !Array.isArray(itemIds)) {
    return NextResponse.json({ message: 'itemIds array is required' }, { status: 400 });
  }

  // Find all reservations with IN_BOX status for the given items
  const inBoxReservations = await prisma.reservation.findMany({
    where: {
      ...activeLoanReservationWhere,
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

  return NextResponse.json({
    inBoxItems: Array.from(inBoxItemsMap.values()),
  });
}
