import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logItemHistory } from '@/utils/itemHistory';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

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
