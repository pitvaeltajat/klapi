export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import prisma from '@/utils/prisma';
import { auth } from '@/lib/auth';
import { serialize } from '@/utils/serialize';
import { LoanType } from '@/components/LoanCard';
import LoanListClient from './LoanListClient';
import { reportSummarySelect } from '@/utils/loanQueries';

export const metadata = { title: 'Lainat | Klapi' };

export default async function LoanListPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?from=' + encodeURIComponent('/loan'));
  }

  const isAdminOrKiosk = session.user.group === 'ADMIN' || session.user.group === 'KIOSK';

  const loans = await prisma.loan.findMany({
    where: isAdminOrKiosk ? {} : { userId: session.user.id },
    select: {
      id: true,
      userId: true,
      status: true,
      description: true,
      loaner: true,
      startTime: true,
      endTime: true,
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
