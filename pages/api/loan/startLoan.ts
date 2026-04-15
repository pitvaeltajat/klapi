import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import type { NextApiRequest, NextApiResponse } from 'next';
import { logLoanHistory } from '../../../utils/loanHistory';

// Converts an approved loan to in-use status
// Can be called by:
// - The loan owner (to start their own approved loan)
// - KIOSK user (to start any approved loan on behalf of the loaner)
// - ADMIN user (to start any approved loan)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user) {
    res.status(401).json({ message: 'Kirjaudu sisään' });
    return;
  }

  const { id } = req.body;

  if (!id) {
    res.status(400).json({ message: 'Lainan ID puuttuu' });
    return;
  }

  // Fetch the loan to check ownership and current status
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { reservations: true },
  });

  if (!loan) {
    res.status(404).json({ message: 'Lainaa ei löydy' });
    return;
  }

  // Check if loan is in ACCEPTED status
  if (loan.status !== LoanStatus.ACCEPTED) {
    res.status(400).json({ message: 'Vain hyväksytyn lainan voi aloittaa' });
    return;
  }

  // Check authorization: owner, KIOSK, or ADMIN can start the loan
  const isOwner = session.user.id === loan.userId;
  const isKiosk = session.user.group === 'KIOSK';
  const isAdmin = session.user.group === 'ADMIN';

  if (!isOwner && !isKiosk && !isAdmin) {
    res.status(403).json({ message: 'Sinulla ei ole oikeutta aloittaa tätä lainaa' });
    return;
  }

  // Update loan status and all reservation statuses to INUSE
  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: LoanStatus.INUSE,
      // Update start time to now when loan is started
      startTime: new Date(),
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
    action: 'STARTED',
    actedById: session.user.id,
  });

  res.status(200).json(result);
}
