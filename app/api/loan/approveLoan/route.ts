import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

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
  return NextResponse.json(result);
}
