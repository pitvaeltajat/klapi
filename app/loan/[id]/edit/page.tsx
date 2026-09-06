export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { notFound, redirect } from 'next/navigation';
import UserEditLoanView from './UserEditLoanView';

export const metadata = { title: 'Muokkaa varausta | Klapi' };

export default async function UserEditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) redirect('/api/auth/signin');

  const [loan, items] = await Promise.all([
    prisma.loan.findUnique({
      where: { id },
      include: { reservations: { include: { item: true } }, user: true },
    }),
    prisma.item.findMany({ where: activeItemsWhere }),
  ]);

  if (!loan) notFound();

  // A deleted loan is not editable; only an admin even sees that it exists.
  if (loan.deletedAt) redirect(`/loan/${id}`);

  const isAdmin = session.user.group === 'ADMIN';
  const isOwner = session.user.id === loan.userId;

  // Admins use the admin edit page
  if (isAdmin) redirect(`/admin/editLoan/${id}`);

  // Non-owners cannot edit
  if (!isOwner) redirect(`/loan/${id}`);

  // Gate: can only edit before the loan has started
  if (loan.startTime <= new Date()) redirect(`/loan/${id}`);

  return <UserEditLoanView loan={serialize(loan)} items={serialize(items)} />;
}
