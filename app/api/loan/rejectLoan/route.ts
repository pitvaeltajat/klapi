import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { activeLoansWhere } from '@/utils/loanQueries';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();

  // A soft-deleted loan is off the board entirely — restore it first.
  const existing = await prisma.loan.findFirst({
    where: { id, ...activeLoansWhere },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
  }

  // Update loan status and all reservation statuses to REJECTED
  const result = await prisma.loan.update({
    where: { id: id },
    data: {
      status: LoanStatus.REJECTED,
      reservations: {
        updateMany: {
          where: {},
          data: {
            status: ReservationStatus.REJECTED,
          },
        },
      },
    },
  });
  await logLoanHistory({
    loanId: id,
    action: 'REJECTED',
    ...resolveLoanActor(session),
  });

  // Same as cancelling: a rejected loan comes off the calendar.
  syncLoanCalendarInBackground(id);

  return NextResponse.json(result);
}
