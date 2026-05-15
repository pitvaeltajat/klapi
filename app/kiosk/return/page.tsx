export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import ReturnView from './ReturnView';

export const metadata = { title: 'Palauta lainoja | Klapi' };

export default async function ReturnPage() {
  // Show loans currently in use, plus "stuck" loans: approved and past their
  // pickup time but never marked in use. The borrower has those items
  // physically, so they must be returnable too — otherwise the loan can never
  // be closed through the kiosk.
  const loans = await prisma.loan.findMany({
    where: {
      OR: [
        { reservations: { some: { status: ReservationStatus.INUSE } } },
        {
          status: LoanStatus.ACCEPTED,
          startTime: { lte: new Date() },
          reservations: { some: { status: ReservationStatus.ACCEPTED } },
        },
      ],
    },
    include: { user: true, reservations: { include: { item: true } } },
    orderBy: { startTime: 'desc' },
  });

  return <ReturnView loans={serialize(loans)} />;
}
