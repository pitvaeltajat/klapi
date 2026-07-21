import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();

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
  return NextResponse.json(result);
}
