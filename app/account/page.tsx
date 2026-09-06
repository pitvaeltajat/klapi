export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { auth } from '@/lib/auth';
import AccountView from './AccountView';
import {
  activeLoansWhere,
  notificationPreferenceSelect,
  reportSummarySelect,
} from '@/utils/loanQueries';
import { canReceiveLoanCalendarEvents } from '@/utils/loanCalendar';
import type { ReportCreated, ReportStatus } from '@prisma/client';

export const metadata = { title: 'Oma tili | Klapi' };

export default async function AccountPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return (
      <AccountView
        loans={[]}
        notificationPreferences={{
          emailWeeklyReminder: true,
          emailNewLoanNotification: true,
          emailExpiringReminder: false,
          emailOldBoxNotification: true,
          emailOverdueNotification: true,
          calendarLoanEvents: true,
        }}
        calendarAvailable={false}
      />
    );
  }

  const [rawLoans, user] = await Promise.all([
    prisma.loan.findMany({
      where: { ...activeLoansWhere, user: { id: session.user.id } },
      include: {
        user: true,
        reservations: {
          include: {
            item: { select: { id: true, name: true } },
          },
        },
        reports: { select: reportSummarySelect },
      },
      // Newest first, ordered in the database — AccountView renders these in
      // that order and no longer re-sorts the whole history client-side.
      orderBy: { startTime: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { ...notificationPreferenceSelect, email: true, group: true },
    }),
  ]);

  const loans = rawLoans.map((loan) => ({
    ...loan,
    reports: loan.reports.map((report) => ({
      ...report,
      created: report.created as ReportCreated,
      status: report.status as ReportStatus,
    })),
  }));

  return (
    <AccountView
      loans={serialize(loans)}
      notificationPreferences={{
        emailWeeklyReminder: user?.emailWeeklyReminder ?? true,
        emailNewLoanNotification: user?.emailNewLoanNotification ?? true,
        emailExpiringReminder: user?.emailExpiringReminder ?? false,
        emailOldBoxNotification: user?.emailOldBoxNotification ?? true,
        emailOverdueNotification: user?.emailOverdueNotification ?? true,
        calendarLoanEvents: user?.calendarLoanEvents ?? true,
      }}
      calendarAvailable={canReceiveLoanCalendarEvents(user?.email ?? null, user?.group ?? 'USER')}
    />
  );
}
