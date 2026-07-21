export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ReturnView from './ReturnView';
import { loanWithReservationsInclude } from '@/utils/loanQueries';

export const metadata = { title: 'Palauta lainoja | Klapi' };

export default async function ReturnPage() {
  const session = await getServerSession(authOptions);

  // ADMIN/KIOSK can return any loan; regular users only see their own.
  const isAdminOrKiosk =
    session?.user?.group === 'ADMIN' || session?.user?.group === 'KIOSK';

  // Show loans currently in use, plus "stuck" loans: approved and past their
  // pickup time but never marked in use. The borrower has those items
  // physically, so they must be returnable too — otherwise the loan can never
  // be closed through the kiosk.
  const loans = session?.user
    ? await prisma.loan.findMany({
        where: {
          OR: [
            { reservations: { some: { status: ReservationStatus.INUSE } } },
            {
              status: LoanStatus.ACCEPTED,
              startTime: { lte: new Date() },
              reservations: { some: { status: ReservationStatus.ACCEPTED } },
            },
          ],
          ...(isAdminOrKiosk ? {} : { userId: session.user.id }),
        },
        include: loanWithReservationsInclude,
        orderBy: { startTime: 'desc' },
      })
    : [];

  return <ReturnView loans={serialize(loans)} />;
}
