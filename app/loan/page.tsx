export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import prisma from '@/utils/prisma';
import { auth } from '@/lib/auth';
import { serialize } from '@/utils/serialize';
import { LoanType } from '@/components/LoanCard';
import LoanListClient from './LoanListClient';
import { activeLoansWhere, reportSummarySelect } from '@/utils/loanQueries';

export const metadata = { title: 'Lainat | Klapi' };

export default async function LoanListPage() {
  const session = await auth();
  // `user.id`, not merely `user`. With the cookie shared across pitva.fi, a
  // session minted by Budu — or one belonging to a member soft-deleted here —
  // still carries a name and an email, and the `session` callback marks the
  // refusal by withholding `klapiUserId`. Gating on `user` alone let such a
  // session through with `user.id` undefined, and Prisma DROPS an `undefined`
  // filter: `userId: undefined` stopped scoping the query and handed back
  // every active loan in the association instead of that person's own.
  if (!session?.user?.id) {
    redirect('/login?from=' + encodeURIComponent('/loan'));
  }

  const isAdmin = session.user.group === 'ADMIN';
  const isAdminOrKiosk = isAdmin || session.user.group === 'KIOSK';

  // Admins get the soft-deleted loans too — hidden behind the "Poistetut" chip,
  // which is the only way back to one that was removed by mistake. Nobody else
  // is told they exist, the kiosk included: it is a shared terminal.
  const loans = await prisma.loan.findMany({
    where: isAdmin
      ? {}
      : isAdminOrKiosk
        ? activeLoansWhere
        : { ...activeLoansWhere, userId: session.user.id },
    select: {
      id: true,
      userId: true,
      status: true,
      description: true,
      loaner: true,
      startTime: true,
      endTime: true,
      deletedAt: true,
      user: { select: { name: true, email: true } },
      reservations: {
        select: {
          status: true,
          item: { select: { id: true, name: true } },
        },
      },
      reports: { select: reportSummarySelect },
    },
    // Newest first, ordered in the database rather than re-sorted in JS after
    // the fact — this list is unbounded and the kiosk is not a fast machine.
    orderBy: { startTime: 'desc' },
  });

  return <LoanListClient loans={serialize(loans) as LoanType[]} />;
}
