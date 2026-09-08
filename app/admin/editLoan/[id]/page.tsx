export const dynamic = 'force-dynamic';

import prisma from '@/utils/prisma';
import { auth } from '@/lib/auth';
import { activeItemsWhere } from '@/utils/itemQueries';
import { serialize } from '@/utils/serialize';
import { notFound, redirect } from 'next/navigation';
import EditLoanView from './EditLoanView';

export const metadata = { title: 'Muokkaa lainaa | Klapi' };

/**
 * Gated server-side, before the query — same rule as `/admin/user/[userId]`.
 * `EditLoanView` renders `NotAuthenticated` for a non-admin, but that decision
 * happens in the browser, by which point the loan (and with it the loaner's
 * name and email) has already been serialized into the RSC payload of a page
 * any signed-in member could ask for by id.
 */
export default async function EditLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) redirect('/api/auth/signin');

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: { userId: true, deletedAt: true },
  });

  if (!loan) notFound();

  // The owner's own edit page is `/loan/[id]/edit`; that one redirects an admin
  // here, so the two hand over to each other rather than looping.
  if (session.user.group !== 'ADMIN') {
    redirect(session.user.id === loan.userId ? `/loan/${id}/edit` : `/loan/${id}`);
  }

  // A deleted loan is restored from its own page before it can be edited.
  if (loan.deletedAt) redirect(`/loan/${id}`);

  const [fullLoan, items] = await Promise.all([
    prisma.loan.findUnique({
      where: { id },
      include: { reservations: { include: { item: true } }, user: true },
    }),
    prisma.item.findMany({ where: activeItemsWhere }),
  ]);

  if (!fullLoan) notFound();

  return <EditLoanView loan={serialize(fullLoan)} items={serialize(items)} />;
}
