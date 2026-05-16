export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { notFound } from 'next/navigation';
import EditLoanView from './EditLoanView';

export const metadata = { title: 'Muokkaa lainaa | Klapi' };

export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [loan, items] = await Promise.all([
    prisma.loan.findUnique({
      where: { id },
      include: { reservations: { include: { item: true } }, user: true },
    }),
    prisma.item.findMany({ where: activeItemsWhere }),
  ]);

  if (!loan) notFound();

  return <EditLoanView loan={serialize(loan)} items={serialize(items)} />;
}
