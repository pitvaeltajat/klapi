import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();

  // Update loan status and all reservation statuses to INUSE
  const result = await prisma.loan.update({
    where: { id: id },
    data: {
      status: LoanStatus.INUSE,
      reservations: {
        updateMany: {
          where: {},
          data: {
            status: ReservationStatus.INUSE,
          },
        },
      },
    },
  });
  await logLoanHistory({
    loanId: id,
    action: 'APPROVED',
    ...resolveLoanActor(session),
  });

  // Approving is un-rejecting (see ARCHITECTURE.md): the loan is live again, so
  // it needs its event back.
  syncLoanCalendarInBackground(id);

  return NextResponse.json(result);
}
