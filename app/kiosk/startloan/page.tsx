export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { LoanStatus } from '@prisma/client';
import StartLoanView from './StartLoanView';

export const metadata = { title: 'Aloita lainaus | Klapi' };

export default async function StartLoanPage() {
  const loans = await prisma.loan.findMany({
    where: { status: LoanStatus.ACCEPTED },
    include: { user: true, reservations: { include: { item: true } } },
    orderBy: { startTime: 'asc' },
  });

  return <StartLoanView loans={serialize(loans)} />;
}
