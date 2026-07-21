import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireUser } from '@/utils/apiAuth';

// Marks loan items as returned to a box.
// Can be called by:
// - The loan owner (to return their own loan)
// - KIOSK user (to return any loan on behalf of the loaner)
// - ADMIN user (to return any loan)
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const { id, reservationIds, reportContent } = await request.json() as {
    id: string;
    reservationIds?: string[];
    reportContent?: string;
  };

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
    return NextResponse.json({ message: 'Loan not found' }, { status: 404 });
  }

  const isOwner = session.user.id === loan.userId;
  const isKiosk = session.user.group === 'KIOSK';
  const isAdmin = session.user.group === 'ADMIN';

  if (!isOwner && !isKiosk && !isAdmin) {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  // Determine which reservations to mark as IN_BOX.
  // INUSE reservations are eligible, and so are ACCEPTED ones: a borrower may
  // have picked up the items without ever marking the loan in use, but they
  // still physically have them and must be able to return them.
  // Items already in a box (IN_BOX/RETURNED) cannot be re-returned.
  const eligible = loan.reservations.filter(
    (r) =>
      r.status === ReservationStatus.INUSE || r.status === ReservationStatus.ACCEPTED,
  );
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  if (targetIds.length === 0) {
    return NextResponse.json({ message: 'Ei palautettavia tavaroita' }, { status: 400 });
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
    const loanItemIds = Array.from(
      new Set(loan.reservations.filter((r) => targetIds.includes(r.id)).map((r) => r.itemId)),
    );

    const [boxes, loanCounts, overlappingReservations] = await Promise.all([
      prisma.box.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.loan.groupBy({
        by: ['boxId'],
        where: {
          boxId: { not: null },
          status: { in: [LoanStatus.IN_BOX, LoanStatus.PARTIALLY_RETURNED] },
        },
        _count: { _all: true },
      }),
      loanItemIds.length > 0
        ? prisma.reservation.findMany({
            where: { status: ReservationStatus.IN_BOX, itemId: { in: loanItemIds } },
            select: { loan: { select: { boxId: true } } },
          })
        : Promise.resolve([] as { loan: { boxId: string | null } }[]),
    ]);

    if (boxes.length === 0) {
      return NextResponse.json({ message: 'No boxes available' }, { status: 400 });
    }

    const loanCountByBoxId = new Map<string, number>();
    for (const c of loanCounts) {
      if (c.boxId) loanCountByBoxId.set(c.boxId, c._count._all);
    }
    const overlappingBoxIds = new Set<string>();
    for (const r of overlappingReservations) {
      if (r.loan.boxId) overlappingBoxIds.add(r.loan.boxId);
    }

    const annotated = boxes.map((b) => ({
      ...b,
      loanCount: loanCountByBoxId.get(b.id) ?? 0,
      overlaps: overlappingBoxIds.has(b.id),
    }));

    // Strategy 1: empty box (no loans currently assigned)
    const emptyBox = annotated.find((b) => b.loanCount === 0);
    if (emptyBox) {
      selectedBox = emptyBox;
    } else {
      // Strategy 2: box with no overlapping IN_BOX items, fewest loans
      const noOverlap = annotated.filter((b) => !b.overlaps);
      const pool = noOverlap.length > 0 ? noOverlap : annotated;
      // Strategy 3: fallback to box with fewest loans
      selectedBox = pool.reduce((prev, current) =>
        current.loanCount < prev.loanCount ? current : prev,
      );
    }
  }

  if (!selectedBox) {
    return NextResponse.json({ error: 'No box available' }, { status: 500 });
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

  const trimmedReport = reportContent?.trim() ?? '';
  if (trimmedReport !== '') {
    await prisma.report.create({
      data: {
        loanId: id,
        content: trimmedReport,
        created: 'AFTER_LOAN',
      },
    });
  }

  const returnedItems = loan.reservations
    .filter((r) => targetIds.includes(r.id))
    .map((r) => r.id);
  await logLoanHistory({
    loanId: id,
    action: 'RETURNED_TO_BOX',
    ...resolveLoanActor(session),
    details: {
      boxId: selectedBox.id,
      boxName: selectedBox.name,
      reservationIds: returnedItems,
      count: returnedItems.length,
      newStatus: newLoanStatus,
    },
  });

  return NextResponse.json(result);
}
