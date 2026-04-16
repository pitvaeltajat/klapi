export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { ReservationStatus } from '@prisma/client';
import ReturnView from './ReturnView';

export const metadata = { title: 'Palauta lainoja | Klapi' };

export default async function ReturnPage() {
  const loans = await prisma.loan.findMany({
    where: { reservations: { some: { status: ReservationStatus.INUSE } } },
    include: { user: true, reservations: { include: { item: true } } },
    orderBy: { startTime: 'desc' },
  });

  return <ReturnView loans={serialize(loans)} />;
}
