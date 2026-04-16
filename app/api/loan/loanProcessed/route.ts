import { NextResponse } from 'next/server';
import { ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory } from '@/utils/loanHistory';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const { id, reservationIds } = await request.json() as { id: string; reservationIds?: string[] };

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: { select: { id: true, status: true } },
    },
  });

  if (!loan) {
    return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
  }

  // Only IN_BOX reservations are eligible to be marked as RETURNED here.
  // INUSE items are still physically with the borrower and must not be touched.
  const eligible = loan.reservations.filter((r) => r.status === ReservationStatus.IN_BOX);
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  if (targetIds.length === 0) {
    return NextResponse.json({ message: 'Ei käsiteltäviä tavaroita laatikossa' }, { status: 400 });
  }

  // Post-update reservation states to compute the new loan status.
  const updatedReservationStates = loan.reservations.map((r) =>
    targetIds.includes(r.id) ? { status: ReservationStatus.RETURNED } : { status: r.status },
  );
  const newLoanStatus = deriveLoanStatus(updatedReservationStates, loan.status);

  // Clear boxId when no reservations remain in IN_BOX after this update.
  const hasInBoxRemaining = updatedReservationStates.some(
    (r) => r.status === ReservationStatus.IN_BOX,
  );

  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: newLoanStatus,
      boxId: hasInBoxRemaining ? loan.boxId : null,
      reservations: {
        updateMany: {
          where: { id: { in: targetIds } },
          data: { status: ReservationStatus.RETURNED },
        },
      },
    },
  });

  await logLoanHistory({
    loanId: id,
    action: 'PROCESSED_FROM_BOX',
    actedById: session.user.id,
    details: {
      reservationIds: targetIds,
      count: targetIds.length,
      newStatus: newLoanStatus,
    },
  });

  return NextResponse.json(result);
}
