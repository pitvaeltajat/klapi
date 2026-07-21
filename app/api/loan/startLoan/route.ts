import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireUser } from '@/utils/apiAuth';

// Converts an approved loan to in-use status
// Can be called by:
// - The loan owner (to start their own approved loan)
// - KIOSK user (to start any approved loan on behalf of the loaner)
// - ADMIN user (to start any approved loan)
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const { id, reportContent } = await request.json() as {
    id: string;
    reportContent?: string;
  };

  if (!id) {
    return NextResponse.json({ message: 'Lainan ID puuttuu' }, { status: 400 });
  }

  // Fetch the loan to check ownership and current status
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: { reservations: true },
  });

  if (!loan) {
    return NextResponse.json({ message: 'Lainaa ei löydy' }, { status: 404 });
  }

  // Check if loan is in ACCEPTED status
  if (loan.status !== LoanStatus.ACCEPTED) {
    return NextResponse.json({ message: 'Vain hyväksytyn lainan voi aloittaa' }, { status: 400 });
  }

  // Check authorization: owner, KIOSK, or ADMIN can start the loan
  const isOwner = session.user.id === loan.userId;
  const isKiosk = session.user.group === 'KIOSK';
  const isAdmin = session.user.group === 'ADMIN';

  if (!isOwner && !isKiosk && !isAdmin) {
    return NextResponse.json({ message: 'Sinulla ei ole oikeutta aloittaa tätä lainaa' }, { status: 403 });
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

  const trimmedReport = reportContent?.trim() ?? '';
  if (trimmedReport !== '') {
    await prisma.report.create({
      data: {
        loanId: id,
        content: trimmedReport,
        created: 'BEFORE_LOAN',
      },
    });
  }

  await logLoanHistory({
    loanId: id,
    action: 'STARTED',
    ...resolveLoanActor(session),
  });

  return NextResponse.json(result);
}
