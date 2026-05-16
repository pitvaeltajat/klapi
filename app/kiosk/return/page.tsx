export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { ReservationStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ReturnView from './ReturnView';

export const metadata = { title: 'Palauta lainoja | Klapi' };

export default async function ReturnPage() {
  const session = await getServerSession(authOptions);

  // ADMIN/KIOSK can return any loan; regular users only see their own.
  const isAdminOrKiosk =
    session?.user?.group === 'ADMIN' || session?.user?.group === 'KIOSK';

  const loans = session?.user
    ? await prisma.loan.findMany({
        where: {
          reservations: { some: { status: ReservationStatus.INUSE } },
          ...(isAdminOrKiosk ? {} : { userId: session.user.id }),
        },
        include: { user: true, reservations: { include: { item: true } } },
        orderBy: { startTime: 'desc' },
      })
    : [];

  return <ReturnView loans={serialize(loans)} />;
}
