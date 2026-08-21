export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import NotAuthenticated from '@/components/NotAuthenticated';
import { notificationPreferenceSelect, reportSummarySelect } from '@/utils/loanQueries';
import { canReceiveLoanCalendarEvents } from '@/utils/loanCalendar';
import type { ReportCreated, ReportStatus } from '@prisma/client';
import AdminUserView from './AdminUserView';

export const metadata = { title: 'Käyttäjä | Klapi' };

/**
 * One person, as an admin sees them: the same shape as `/account`, but for
 * somebody else. Gated server-side rather than in the view — the loan history
 * of another member should never reach the browser of a non-admin, so the
 * check has to happen before the query, not around the markup.
 */
export default async function AdminUserPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const session = await auth();
  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      group: true,
      deletedAt: true,
      deletedBySync: true,
      kioskElevatePin: true,
      ...notificationPreferenceSelect,
      // Provenance for the accounts folded in by `scripts/merge-users.ts`, so
      // "minne Ollin vanha gmail-tili katosi" is answerable from the page of
      // the account that absorbed it.
      mergedInto: { select: { id: true, name: true, email: true } },
      mergedFrom: { select: { id: true, name: true, email: true } },
    },
  });

  if (!user) notFound();

  const rawLoans = await prisma.loan.findMany({
    where: { userId },
    include: {
      user: true,
      reservations: { include: { item: { select: { id: true, name: true } } } },
      reports: { select: reportSummarySelect },
    },
    // Newest first, ordered in the database — the view renders them in this
    // order rather than re-sorting the whole history client-side.
    orderBy: { startTime: 'desc' },
  });

  const loans = rawLoans.map((loan) => ({
    ...loan,
    reports: loan.reports.map((report) => ({
      ...report,
      created: report.created as ReportCreated,
      status: report.status as ReportStatus,
    })),
  }));

  const { kioskElevatePin, ...rest } = user;

  return (
    <AdminUserView
      // The PIN hash never leaves the server — the page only says whether one
      // is set.
      user={serialize({ ...rest, hasElevatePin: Boolean(kioskElevatePin) })}
      loans={serialize(loans)}
      calendarAvailable={canReceiveLoanCalendarEvents(user.email, user.group)}
      viewerId={session.user.id}
    />
  );
}
