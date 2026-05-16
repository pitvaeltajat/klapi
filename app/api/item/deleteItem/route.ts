import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const body = await request.json();

  // Soft-delete: stamp deletedAt so reservations and loan history stay
  // intact. Already-archived items become a no-op.
  await prisma.item.update({
    where: { id: body },
    data: { deletedAt: new Date() },
  });
  return NextResponse.json({
    message: 'Kama arkistoitu',
  });
}
