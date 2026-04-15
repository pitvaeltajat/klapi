import { ReservationStatus } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';
import { deriveLoanStatus } from '../../../utils/loanHelpers';
import { logLoanHistory } from '../../../utils/loanHistory';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== 'ADMIN') {
    res.status(401).json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    });
    return;
  }

  const { id, reservationIds } = req.body as { id: string; reservationIds?: string[] };

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: { select: { id: true, status: true } },
    },
  });

  if (!loan) {
    res.status(404).json({ message: 'Loan not found' });
    return;
  }

  // Only IN_BOX reservations are eligible to be marked as RETURNED here.
  // INUSE items are still physically with the borrower and must not be touched.
  const eligible = loan.reservations.filter((r) => r.status === ReservationStatus.IN_BOX);
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  if (targetIds.length === 0) {
    res.status(400).json({ message: 'Ei käsiteltäviä tavaroita laatikossa' });
    return;
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

  res.status(200).json(result);
}
