export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import prisma from '@/utils/prisma';
import { authOptions } from '@/lib/auth';
import { serialize } from '@/utils/serialize';
import { LoanType } from '@/components/LoanCard';
import LoanListClient from './LoanListClient';

export const metadata = { title: 'Lainat | Klapi' };

function compareDates(a: Date | string, b: Date | string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

export default async function LoanListPage() {
  const session = await getServerSession(authOptions);
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
      reports: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          created: true,
          status: true,
        },
      },
    },
  });

  const sorted = [...loans].sort((a, b) => compareDates(a.startTime, b.startTime));

  return <LoanListClient loans={serialize(sorted) as LoanType[]} />;
}
