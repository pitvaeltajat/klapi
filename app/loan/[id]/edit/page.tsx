export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import prisma from '@/utils/prisma';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { LoanStatus } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import EditLoanView from './EditLoanView';

export const metadata = { title: 'Muokkaa lainaa | Klapi' };

/**
 * The one loan edit page. It used to be two — this for the loaner and
 * `/admin/editLoan/[id]` for admins — which drifted into two copies of the same
 * form with different words for the same thing. The admin extras (the loan id,
 * the status picker, editing a loan that is already running) are gated inside
 * the view on `isAdmin` instead.
 *
 * Gated server-side, before the loan reaches the browser: the same rule
 * `/admin/user/[userId]` documents. The permissions mirror `canEdit` in
 * `LoanView` — an admin may edit a live loan, the loaner only their own and
 * only while it has not started.
 */
export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) redirect('/api/auth/signin');

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { reservations: { include: { item: true } }, user: true },
  });

  if (!loan) notFound();

  // A deleted loan is restored from its own page before it can be edited.
  if (loan.deletedAt) redirect(`/loan/${id}`);

  const isAdmin = session.user.group === 'ADMIN';
  const isOwner = session.user.id === loan.userId;
  const status = deriveLoanStatus(loan.reservations, loan.status);

  // PARTIALLY_RETURNED is excluded even for an admin: its reservations carry a
  // mix of statuses that `updateLoan`'s recreate-all would flatten.
  const canEdit = isAdmin
    ? status !== LoanStatus.CANCELLED &&
      status !== LoanStatus.PARTIALLY_RETURNED &&
      status !== LoanStatus.RETURNED
    : isOwner && loan.startTime > new Date() && status === LoanStatus.ACCEPTED;

  if (!canEdit) redirect(`/loan/${id}`);

  const items = await prisma.item.findMany({ where: activeItemsWhere });

  return <EditLoanView loan={serialize(loan)} items={serialize(items)} isAdmin={isAdmin} />;
}
