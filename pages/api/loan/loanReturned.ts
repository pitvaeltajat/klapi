import { LoanStatus } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (session?.user?.group !== 'ADMIN' && session?.user?.group !== 'KIOSK') {
    res.status(401).json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    });
    return;
  }

  const { id } = req.body;

  // Get the loan with its items
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: {
        select: {
          itemId: true,
        },
      },
    },
  });

  if (!loan) {
    res.status(404).json({ message: 'Loan not found' });
    return;
  }

  // Get item IDs from the loan being returned
  const loanItemIds = new Set(loan.reservations.map((r) => r.itemId));

  // Find all boxes with their loans and items
  const boxes = await prisma.box.findMany({
    include: {
      loans: {
        where: {
          status: LoanStatus.IN_BOX,
        },
        include: {
          reservations: {
            select: {
              itemId: true,
            },
          },
        },
      },
    },
  });

  if (boxes.length === 0) {
    res.status(400).json({ message: 'No boxes available' });
    return;
  }

  // Strategy 1: Find a box with no loans (empty box)
  const emptyBox = boxes.find((box) => box.loans.length === 0);
  let selectedBox;
  if (emptyBox) {
    selectedBox = emptyBox;
  } else {
    // Strategy 2: Find a box with no overlapping items
    const loanItemIdsArray = Array.from(loanItemIds);
    const boxesWithNoOverlap = boxes.filter((box) => {
      const boxItemIds = new Set(
        box.loans.flatMap((loan) => loan.reservations.map((r) => r.itemId)),
      );
      // Check if there's no intersection between loan items and box items
      return !loanItemIdsArray.some((itemId) => boxItemIds.has(itemId));
    });

    if (boxesWithNoOverlap.length > 0) {
      // Select the one with fewest loans
      selectedBox = boxesWithNoOverlap.reduce((prev, current) =>
        current.loans.length < prev.loans.length ? current : prev,
      );
    } else {
      // Strategy 3: Fallback to box with fewest loans
      selectedBox = boxes.reduce((prev, current) =>
        current.loans.length < prev.loans.length ? current : prev,
      );
    }
  }

  // Update loan status to IN_BOX and assign it to the selected box
  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: LoanStatus.IN_BOX,
      boxId: selectedBox.id,
    },
    include: {
      box: true,
    },
  });

  res.status(200).json(result);
}
