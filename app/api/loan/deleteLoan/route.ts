import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';

// Soft-deletes a loan: an admin removing a loan that should never have existed
// (a duplicate, a test, one entered on the wrong account). The row is kept —
// stamping `deletedAt` hides the loan from every listing, availability sum and
// cron sweep, and takes its event off the shared calendar, while the
// reservations, huomiot and audit trail survive so the mistake can be looked at
// and undone. `loan/restoreLoan` is the way back.
//
// Distinct from cancelling and rejecting, which are decisions *about* a loan
// and stay visible as such.
export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ message: 'Lainan ID puuttuu' }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({
    where: { id },
    select: { id: true, deletedAt: true },
  });

  if (!loan) {
    return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
  }

  if (loan.deletedAt) {
    return NextResponse.json({ message: 'Laina on jo poistettu' }, { status: 409 });
  }

  const result = await prisma.loan.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logLoanHistory({
    loanId: id,
    action: 'DELETED',
    ...resolveLoanActor(session),
  });

  // A deleted loan has no business on the shared calendar.
  syncLoanCalendarInBackground(id);

  return NextResponse.json(result);
}
