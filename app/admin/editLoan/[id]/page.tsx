export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { notFound, redirect } from 'next/navigation';
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

  // A deleted loan is restored from its own page before it can be edited.
  if (loan.deletedAt) redirect(`/loan/${id}`);

  return <EditLoanView loan={serialize(loan)} items={serialize(items)} />;
}
