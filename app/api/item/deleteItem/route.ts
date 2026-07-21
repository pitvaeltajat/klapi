import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();

  const before = await prisma.item.findUnique({
    where: { id: body },
    select: { name: true, deletedAt: true },
  });

  // Soft-delete: stamp deletedAt so reservations and loan history stay
  // intact. Already-archived items become a no-op.
  await prisma.item.update({
    where: { id: body },
    data: { deletedAt: new Date() },
  });

  // Only record the live → archived transition, not re-archiving.
  if (before && !before.deletedAt) {
    await logItemHistory({
      itemId: body,
      action: 'ARCHIVED',
      actedById: session.user.id,
      details: { name: before.name },
    });
  }

  return NextResponse.json({
    message: 'Kama arkistoitu',
  });
}
