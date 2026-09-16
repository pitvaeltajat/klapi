import { NextResponse } from 'next/server';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireUser } from '@/utils/apiAuth';
import { activeLoanReservationWhere, activeLoansWhere } from '@/utils/loanQueries';

// Marks loan items as returned to a box.
// Can be called by:
// - The loan owner (to return their own loan)
// - KIOSK user (to return any loan on behalf of the loaner)
// - ADMIN user (to return any loan)
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const { id, reservationIds, returns, reportContent } = await request.json() as {
    id: string;
    reservationIds?: string[];
    /**
     * Per-reservation return amounts — how many of each reservation to hand
     * back. Lets a borrower return 2 of 3 identical kamat: the reservation is
     * split, the returned amount minted as its own IN_BOX line while the rest
     * stays out. `reservationIds` (whole reservations) is the older form.
     */
    returns?: Array<{ reservationId: string; amount: number }>;
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
          amount: true,
        },
      },
    },
  });

  if (!loan || loan.deletedAt) {
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

  // The whole-reservation form: every eligible reservation named is returned
  // in full. Kept for the older callers (the loan page's check-in flow).
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  // The per-amount form: `{ reservationId, amount }` — how many of each
  // reservation to hand back. A reservation returned in full is just a whole
  // target; one returned only in part is split, the returned amount minted as
  // its own IN_BOX line while the rest stays out.
  const returnAmounts = new Map<string, number>();
  if (Array.isArray(returns) && returns.length > 0) {
    for (const { reservationId, amount } of returns) {
      const reservation = eligible.find((r) => r.id === reservationId);
      if (!reservation) continue;
      const clamped = Math.max(0, Math.min(Math.floor(amount), reservation.amount));
      if (clamped > 0) returnAmounts.set(reservationId, clamped);
    }
  }

  // A reservation that is returned in full (either form) is a plain target.
  const fullReturnIds = new Set<string>();
  for (const r of eligible) {
    const amount = returnAmounts.get(r.id);
    if (amount === undefined) {
      if (targetIds.includes(r.id)) fullReturnIds.add(r.id);
    } else if (amount >= r.amount) {
      fullReturnIds.add(r.id);
    }
  }

  // A reservation returned only in part must be split: the returned amount
  // becomes a new IN_BOX line, the remainder stays out on the original.
  const splitReturns = eligible
    .filter((r) => {
      const amount = returnAmounts.get(r.id);
      return amount !== undefined && amount > 0 && amount < r.amount;
    })
    .map((r) => ({ reservation: r, amount: returnAmounts.get(r.id)! }));

  if (fullReturnIds.size === 0 && splitReturns.length === 0) {
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
    const returningReservations = [
      ...loan.reservations.filter((r) => fullReturnIds.has(r.id)),
      ...splitReturns.map((s) => s.reservation),
    ];
    const loanItemIds = Array.from(
      new Set(returningReservations.map((r) => r.itemId)),
    );

    const [boxes, loanCounts, overlappingReservations] = await Promise.all([
      prisma.box.findMany({
        select: { id: true, name: true, description: true },
        orderBy: { name: 'asc' },
      }),
      prisma.loan.groupBy({
        by: ['boxId'],
        where: {
          ...activeLoansWhere,
          boxId: { not: null },
          status: { in: [LoanStatus.IN_BOX, LoanStatus.PARTIALLY_RETURNED] },
        },
        _count: { _all: true },
      }),
      loanItemIds.length > 0
        ? prisma.reservation.findMany({
            where: {
              ...activeLoanReservationWhere,
              status: ReservationStatus.IN_BOX,
              itemId: { in: loanItemIds },
            },
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
  // A split reservation contributes one IN_BOX line (the returned amount) and
  // keeps its original line out with the remainder.
  const updatedReservationStates = [
    ...loan.reservations.map((r) =>
      fullReturnIds.has(r.id) ? { status: ReservationStatus.IN_BOX } : { status: r.status },
    ),
    ...splitReturns.map(() => ({ status: ReservationStatus.IN_BOX })),
  ];
  const newLoanStatus = deriveLoanStatus(updatedReservationStates, loan.status);

  const result = await prisma.loan.update({
    where: { id },
    data: {
      status: newLoanStatus,
      boxId: selectedBox.id,
      reservations: {
        // Whole reservations returned in full flip to IN_BOX.
        updateMany: {
          where: { id: { in: Array.from(fullReturnIds) } },
          data: { status: ReservationStatus.IN_BOX },
        },
        // A partially returned reservation keeps its line — reduced to the
        // remainder — and gains a new IN_BOX line for the returned amount.
        ...(splitReturns.length > 0
          ? {
              update: splitReturns.map(({ reservation, amount }) => ({
                where: { id: reservation.id },
                data: { amount: reservation.amount - amount },
              })),
              create: splitReturns.map(({ reservation, amount }) => ({
                itemId: reservation.itemId,
                amount,
                status: ReservationStatus.IN_BOX,
              })),
            }
          : {}),
      },
    },
    include: {
      box: true,
      reservations: true,
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

  const returnedItems = [
    ...loan.reservations.filter((r) => fullReturnIds.has(r.id)).map((r) => r.id),
    ...splitReturns.map((s) => s.reservation.id),
  ];
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
      // The split lines, for the audit trail: which reservation gave up how
      // many, and the new IN_BOX line minted for them.
      ...(splitReturns.length > 0
        ? {
            splits: splitReturns.map(({ reservation, amount }) => ({
              reservationId: reservation.id,
              itemId: reservation.itemId,
              returnedAmount: amount,
            })),
          }
        : {}),
    },
  });

  return NextResponse.json(result);
}
