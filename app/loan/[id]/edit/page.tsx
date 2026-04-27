export const dynamic = 'force-dynamic';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { notFound, redirect } from 'next/navigation';
import UserEditLoanView from './UserEditLoanView';

export const metadata = { title: 'Muokkaa varausta | Klapi' };

export default async function UserEditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/api/auth/signin');

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { reservations: { include: { item: true } }, user: true },
  });

  if (!loan) notFound();

  const isAdmin = session.user.group === 'ADMIN';
  const isOwner = session.user.id === loan.userId;

  // Admins use the admin edit page
  if (isAdmin) redirect(`/admin/editLoan/${id}`);

  // Non-owners cannot edit
  if (!isOwner) redirect(`/loan/${id}`);

  // Gate: can only edit before the loan has started
  if (loan.startTime <= new Date()) redirect(`/loan/${id}`);

  const items = await prisma.item.findMany({ where: activeItemsWhere });

  return <UserEditLoanView loan={serialize(loan)} items={serialize(items)} />;
}
