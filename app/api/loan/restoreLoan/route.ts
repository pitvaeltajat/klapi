import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';

// Undoes `loan/deleteLoan`: clears `deletedAt` and the loan is back exactly as
// it was — the reservations kept their statuses, so nothing has to be rebuilt.
// The button lives on the loan's own page, which is the one place a deleted
// loan is still reachable (admins only).
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

  if (!loan.deletedAt) {
    return NextResponse.json({ message: 'Laina ei ole poistettu' }, { status: 409 });
  }

  const result = await prisma.loan.update({
    where: { id },
    data: { deletedAt: null },
  });

  await logLoanHistory({
    loanId: id,
    action: 'RESTORED',
    ...resolveLoanActor(session),
  });

  // Back on the calendar, unless its status keeps it off anyway.
  syncLoanCalendarInBackground(id);

  return NextResponse.json(result);
}
