export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { serialize } from '@/utils/serialize';
import { activeItemsWhere } from '@/utils/itemQueries';
import { LoanStatus } from '@prisma/client';
import StartLoanView from './StartLoanView';

export const metadata = { title: 'Aloita lainaus | Klapi' };

export default async function StartLoanPage() {
  const [loans, items] = await Promise.all([
    prisma.loan.findMany({
      where: { status: LoanStatus.ACCEPTED },
      include: { user: true, reservations: { include: { item: true } } },
      orderBy: { startTime: 'asc' },
    }),
    prisma.item.findMany({ where: activeItemsWhere, orderBy: { name: 'asc' } }),
  ]);

  return <StartLoanView loans={serialize(loans)} items={serialize(items)} />;
}
