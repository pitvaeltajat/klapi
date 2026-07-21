export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AccountView from './AccountView';
import { emailPreferenceSelect, reportSummarySelect } from '@/utils/loanQueries';
import type { ReportCreated, ReportStatus } from '@prisma/client';

export const metadata = { title: 'Oma tili | Klapi' };

export default async function AccountPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return (
      <AccountView
        loans={[]}
        userEmailPreferences={{
          emailWeeklyReminder: true,
          emailNewLoanNotification: true,
          emailOldBoxNotification: true,
          emailOverdueNotification: true,
        }}
      />
    );
  }

  const [rawLoans, user] = await Promise.all([
    prisma.loan.findMany({
      where: { user: { id: session.user.id } },
      include: {
        user: true,
        reservations: {
          include: {
            item: { select: { id: true, name: true } },
          },
        },
        reports: { select: reportSummarySelect },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: emailPreferenceSelect,
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
      userEmailPreferences={{
        emailWeeklyReminder: user?.emailWeeklyReminder ?? true,
        emailNewLoanNotification: user?.emailNewLoanNotification ?? true,
        emailOldBoxNotification: user?.emailOldBoxNotification ?? true,
        emailOverdueNotification: user?.emailOverdueNotification ?? true,
      }}
    />
  );
}
