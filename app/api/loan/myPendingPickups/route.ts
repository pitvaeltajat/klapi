import { NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Returns the signed-in user's loans that have been approved and whose pickup
// time has already arrived, but which have not yet been marked in use. These
// are surfaced as a banner so borrowers remember to start the loan.
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ loans: [] });
  }

  const loans = await prisma.loan.findMany({
    where: {
      userId: session.user.id,
      status: LoanStatus.ACCEPTED,
      startTime: { lte: new Date() },
    },
    select: {
      id: true,
      description: true,
      startTime: true,
      _count: { select: { reservations: true } },
    },
    orderBy: { startTime: 'asc' },
  });

  return NextResponse.json({
    loans: loans.map((loan) => ({
      id: loan.id,
      description: loan.description,
      startTime: loan.startTime,
      itemCount: loan._count.reservations,
    })),
  });
}
