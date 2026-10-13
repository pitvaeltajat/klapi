import { NextResponse } from 'next/server';
import { LoanStatus, Prisma, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireUser } from '@/utils/apiAuth';
import {
  activeLoanReservationWhere,
  activeLoansWhere,
  itemBoxContentsInclude,
} from '@/utils/loanQueries';
import { boxContents } from '@/utils/boxContents';

// Marks loan items as returned to a box.
// Can be called by:
// - The loan owner (to return their own loan)
// - KIOSK user (to return any loan on behalf of the loaner)
// - ADMIN user (to return any loan)
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const { id, reservationIds, returns, boxReturns, reportContent } = (await request.json()) as {
    id: string;
    reservationIds?: string[];
    /**
     * Per-reservation return amounts — how many of each reservation to hand
     * back. Lets a borrower return 2 of 3 identical kamat: the reservation is
     * split, the returned amount minted as its own IN_BOX line while the rest
     * stays out. `reservationIds` (whole reservations) is the older form.
     */
    returns?: Array<{ reservationId: string; amount: number }>;
    /**
     * Per-content returns for a box reservation: how many units of each content
     * are back in the box and how many were reported missing this time. The box
     * flips to IN_BOX only once every content is fully accounted for; until then
     * it stays out and the loan is PARTIALLY_RETURNED. See `BoxContentReturn`.
     */
    boxReturns?: Array<{
      reservationId: string;
      contents: Array<{ itemId: string; returned: number; missing: number }>;
    }>;
    reportContent?: string;
  };

  // Get the loan with its reservations. The box reservations carry their current
  // contents (`asLocation`) and the per-content return progress so far, so we
  // can tell how much of each box is still owed.
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: {
        select: {
          id: true,
          itemId: true,
          status: true,
          amount: true,
          item: { include: itemBoxContentsInclude },
          boxContentReturns: {
            select: { itemId: true, returnedAmount: true, missingAmount: true },
          },
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
    return NextResponse.json(
      {
        message: 'Sinulla ei ole oikeutta tähän toimintoon',
      },
      { status: 401 },
    );
  }

  // Determine which reservations to mark as IN_BOX.
  // INUSE reservations are eligible, and so are ACCEPTED ones: a borrower may
  // have picked up the items without ever marking the loan in use, but they
  // still physically have them and must be able to return them.
  // Items already in a box (IN_BOX/RETURNED) cannot be re-returned.
  const eligible = loan.reservations.filter(
    (r) => r.status === ReservationStatus.INUSE || r.status === ReservationStatus.ACCEPTED,
  );

  // The whole-reservation form: every eligible reservation named is returned
  // in full. Kept for the older callers (the loan page's check-in flow).
  // Default to returning every eligible reservation ONLY for the bare old
  // caller that names nothing at all. Once any explicit selector is present —
  // even an empty `reservationIds: []` sent alongside a `boxReturns` — an empty
  // list means "none of the whole reservations", not "all of them": a box-only
  // return must not sweep the rest of the loan into the box.
  const hasExplicitSelection =
    Array.isArray(reservationIds) ||
    (Array.isArray(returns) && returns.length > 0) ||
    (Array.isArray(boxReturns) && boxReturns.length > 0);
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : hasExplicitSelection
        ? []
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

  // Per-content returns for a box. Each content's returned/missing is clamped to
  // what is still owed on it (amount − already accounted), the increment queued
  // as a BoxContentReturn upsert, and the box flipped to IN_BOX only once every
  // content it still carries is fully accounted for. Contents out on another
  // loan were never in this box, so they neither block the flip nor take a tick.
  const boxUpserts: Prisma.PrismaPromise<unknown>[] = [];
  const boxTouchedIds = new Set<string>();
  const boxContentBreakdown: Array<{
    reservationId: string;
    itemId: string;
    returned: number;
    missing: number;
  }> = [];

  for (const entry of Array.isArray(boxReturns) ? boxReturns : []) {
    const reservation = eligible.find((r) => r.id === entry.reservationId);
    if (!reservation) continue;
    const contents = boxContents(reservation.item.asLocation, loan.id);
    if (contents.length === 0) continue; // not a box

    const priorById = new Map(reservation.boxContentReturns.map((p) => [p.itemId, p]));
    const addById = new Map<string, { returned: number; missing: number }>();

    for (const requested of Array.isArray(entry.contents) ? entry.contents : []) {
      const content = contents.find((c) => c.id === requested.itemId);
      if (!content || content.outOnLoan) continue;
      const prior = priorById.get(requested.itemId);
      const already = (prior?.returnedAmount ?? 0) + (prior?.missingAmount ?? 0);
      const remaining = Math.max(0, content.amount - already);
      const addReturned = Math.max(0, Math.min(Math.floor(requested.returned ?? 0), remaining));
      const addMissing = Math.max(
        0,
        Math.min(Math.floor(requested.missing ?? 0), remaining - addReturned),
      );
      if (addReturned === 0 && addMissing === 0) continue;
      addById.set(requested.itemId, { returned: addReturned, missing: addMissing });
    }

    if (addById.size === 0) continue;
    boxTouchedIds.add(reservation.id);

    for (const [itemId, add] of addById) {
      boxUpserts.push(
        prisma.boxContentReturn.upsert({
          where: { reservationId_itemId: { reservationId: reservation.id, itemId } },
          create: {
            reservationId: reservation.id,
            itemId,
            returnedAmount: add.returned,
            missingAmount: add.missing,
          },
          update: {
            returnedAmount: { increment: add.returned },
            missingAmount: { increment: add.missing },
          },
        }),
      );
      boxContentBreakdown.push({
        reservationId: reservation.id,
        itemId,
        returned: add.returned,
        missing: add.missing,
      });
    }

    // Fully accounted for when nothing this box still carries is left owing.
    const allAccounted = contents.every((content) => {
      if (content.outOnLoan) return true;
      const prior = priorById.get(content.id);
      const add = addById.get(content.id);
      const total =
        (prior?.returnedAmount ?? 0) +
        (prior?.missingAmount ?? 0) +
        (add?.returned ?? 0) +
        (add?.missing ?? 0);
      return total >= content.amount;
    });
    if (allAccounted) fullReturnIds.add(reservation.id);
  }

  if (fullReturnIds.size === 0 && splitReturns.length === 0 && boxUpserts.length === 0) {
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
    // A partly-returned box also needs a physical box picked — its returned
    // contents have to land somewhere — so count the box reservations touched
    // this time even when they are not yet flipped to IN_BOX.
    const returningReservations = [
      ...loan.reservations.filter((r) => fullReturnIds.has(r.id) || boxTouchedIds.has(r.id)),
      ...splitReturns.map((s) => s.reservation),
    ];
    const loanItemIds = Array.from(new Set(returningReservations.map((r) => r.itemId)));

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

  // The box-content writes and the loan/reservation update land together: a
  // half-applied return would leave a box flipped to IN_BOX without its content
  // progress, or vice versa.
  const loanUpdate = prisma.loan.update({
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

  const [result] = await prisma.$transaction([loanUpdate, ...boxUpserts]);

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
      // Per-content box progress recorded this time, for the audit trail.
      ...(boxContentBreakdown.length > 0 ? { boxContents: boxContentBreakdown } : {}),
    },
  });

  return NextResponse.json(result);
}
