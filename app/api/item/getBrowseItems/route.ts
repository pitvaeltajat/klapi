import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { visibleItemsWhere } from '@/utils/itemQueries';

export async function GET() {
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

  return NextResponse.json({ items, categories });
}
