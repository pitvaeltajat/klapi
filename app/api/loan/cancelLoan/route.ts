import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireUser } from '@/utils/apiAuth';

// Lets the loan owner (or an admin) cancel an approved loan that has not yet
// been picked up. Distinct from admin rejection: cancelling is the borrower
// withdrawing their own reservation. Only ACCEPTED loans can be cancelled —
// once items are in use they must be returned, not cancelled.
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const { id } = (await request.json()) as { id: string };

  if (!id) {
    return NextResponse.json({ message: 'Lainan ID puuttuu' }, { status: 400 });
  }

  const loan = await prisma.loan.findUnique({ where: { id } });

  if (!loan) {
    return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
  }

  const isOwner = session.user.id === loan.userId;
  const isAdmin = session.user.group === 'ADMIN';

  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { message: 'Sinulla ei ole oikeutta perua tätä lainaa' },
      { status: 403 },
    );
  }

  if (loan.status !== LoanStatus.ACCEPTED) {
    return NextResponse.json(
      { message: 'Vain noutamattoman lainan voi perua' },
      { status: 400 },
    );
  }

  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: LoanStatus.CANCELLED,
      reservations: {
        updateMany: {
          where: {},
          data: { status: ReservationStatus.REJECTED },
        },
      },
    },
  });

  await logLoanHistory({
    loanId: id,
    action: 'CANCELLED',
    ...resolveLoanActor(session),
  });

  return NextResponse.json(result);
}
