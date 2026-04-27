import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Sinulla ei ole oikeutta tähän toimintoon' },
      { status: 401 },
    );
  }

  // Default to active items only. ?archived=only or ?archived=all let admins
  // pull archived items in for the inventory editor's archive view.
  const archived = new URL(request.url).searchParams.get('archived');
  const where: Prisma.ItemWhereInput =
    archived === 'all' ? {} : archived === 'only' ? { NOT: { deletedAt: null } } : { deletedAt: null };

  const items = await prisma.item.findMany({
    where,
    include: {
      categories: true,
      location: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(items);
}
