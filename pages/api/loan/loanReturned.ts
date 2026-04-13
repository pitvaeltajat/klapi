import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';
import { deriveLoanStatus } from '../../../utils/loanHelpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== 'ADMIN' && session?.user?.group !== 'KIOSK') {
    res.status(401).json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    });
    return;
  }

  const { id, reservationIds } = req.body as { id: string; reservationIds?: string[] };

  // Get the loan with its reservations
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: {
        select: {
          id: true,
          itemId: true,
          status: true,
        },
      },
    },
  });

  if (!loan) {
    res.status(404).json({ message: 'Loan not found' });
    return;
  }

  // Determine which reservations to mark as IN_BOX.
  // Only INUSE reservations are eligible (can't re-return something already in a box).
  const eligible = loan.reservations.filter((r) => r.status === ReservationStatus.INUSE);
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  if (targetIds.length === 0) {
    res.status(400).json({ message: 'Ei palautettavia tavaroita' });
    return;
  }

  // Pick the box. If this loan is already assigned to a box (because of a
  // previous partial return), reuse it so the loan's items stay together.
  let selectedBox: { id: string; name: string; description: string | null } | null = null;

  if (loan.boxId) {
    selectedBox = await prisma.box.findUnique({
      where: { id: loan.boxId },
      select: { id: true, name: true, description: true },
    });
  }

  if (!selectedBox) {
    // Target item IDs for box-selection heuristics (only the items currently being returned).
    const loanItemIds = new Set(
      loan.reservations.filter((r) => targetIds.includes(r.id)).map((r) => r.itemId),
    );

    const boxes = await prisma.box.findMany({
      include: {
        loans: {
          where: { status: { in: [LoanStatus.IN_BOX, LoanStatus.PARTIALLY_RETURNED] } },
          include: {
            reservations: {
              where: { status: ReservationStatus.IN_BOX },
              select: { itemId: true },
            },
          },
        },
      },
    });

    if (boxes.length === 0) {
      res.status(400).json({ message: 'No boxes available' });
      return;
    }

    // Strategy 1: empty box (no loans currently assigned)
    const emptyBox = boxes.find((box) => box.loans.length === 0);
    if (emptyBox) {
      selectedBox = emptyBox;
    } else {
      // Strategy 2: box with no overlapping IN_BOX items
      const loanItemIdsArray = Array.from(loanItemIds);
      const boxesWithNoOverlap = boxes.filter((box) => {
        const boxItemIds = new Set(
          box.loans.flatMap((l) => l.reservations.map((r) => r.itemId)),
        );
        return !loanItemIdsArray.some((itemId) => boxItemIds.has(itemId));
      });

      if (boxesWithNoOverlap.length > 0) {
        selectedBox = boxesWithNoOverlap.reduce((prev, current) =>
          current.loans.length < prev.loans.length ? current : prev,
        );
      } else {
        // Strategy 3: fallback to box with fewest loans
        selectedBox = boxes.reduce((prev, current) =>
          current.loans.length < prev.loans.length ? current : prev,
        );
      }
    }
  }

  // Compute the new derived loan status based on the post-update reservation states.
  const updatedReservationStates = loan.reservations.map((r) =>
    targetIds.includes(r.id) ? { status: ReservationStatus.IN_BOX } : { status: r.status },
  );
  const newLoanStatus = deriveLoanStatus(updatedReservationStates, loan.status);

  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: newLoanStatus,
      boxId: selectedBox.id,
      reservations: {
        updateMany: {
          where: { id: { in: targetIds } },
          data: { status: ReservationStatus.IN_BOX },
        },
      },
    },
    include: {
      box: true,
    },
  });

  res.status(200).json(result);
}
