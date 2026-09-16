export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import ReturnView from './ReturnView';
import { activeLoansWhere, loanWithReservationsInclude } from '@/utils/loanQueries';

export const metadata = { title: 'Palauta lainoja | Klapi' };

export default async function ReturnPage() {
  const session = await auth();

  // ADMIN/KIOSK can return any loan; regular users only see their own.
  const isAdminOrKiosk =
    session?.user?.group === 'ADMIN' || session?.user?.group === 'KIOSK';

  // Show loans that still have items out, so the borrower can return them:
  // - loans currently in use (INUSE reservations),
  // - partially returned loans (some items back, some still out — the borrower
  //   must be able to return the rest),
  // - "stuck" loans: approved and past their pickup time but never marked in
  //   use. The borrower has those items physically, so they must be returnable
  //   too — otherwise the loan can never be closed through the kiosk.
  // `user.id` for the same reason as `/loan`: a session Klapi refused still has
  // a `user`, and `userId: undefined` below would widen the query to everyone's
  // loans rather than narrowing it to this person's.
  const loans = session?.user?.id
    ? await prisma.loan.findMany({
        where: {
          ...activeLoansWhere,
          OR: [
            { reservations: { some: { status: ReservationStatus.INUSE } } },
            { status: LoanStatus.PARTIALLY_RETURNED },
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
