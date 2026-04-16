import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const isAdminOrKiosk = session.user.group === 'ADMIN' || session.user.group === 'KIOSK';

  const loans = await prisma.loan.findMany({
    where: isAdminOrKiosk ? {} : { userId: session.user.id },
    include: {
      user: true,
      reservations: {
        include: {
          item: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      reports: true,
    },
  });

  return NextResponse.json(loans);
}
