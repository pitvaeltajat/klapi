import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const body = (await request.json()) as string;

  const before = await prisma.item.findUnique({
    where: { id: body },
    select: { name: true, deletedAt: true },
  });

  await prisma.item.update({
    where: { id: body },
    data: { deletedAt: null },
  });

  // Only record the archived → live transition.
  if (before && before.deletedAt) {
    await logItemHistory({
      itemId: body,
      action: 'RESTORED',
      actedById: session.user.id,
      details: { name: before.name },
    });
  }

  return NextResponse.json({ message: 'Kama palautettu' });
}
