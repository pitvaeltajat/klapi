import { NextResponse } from 'next/server';
import { Prisma, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { itemBoxContentsInclude } from '@/utils/loanQueries';
import { boxContents } from '@/utils/boxContents';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const { id, reservationIds, boxVerifications } = (await request.json()) as {
    id: string;
    reservationIds?: string[];
    /**
     * The admin's shelving check for each box being returned: units of a content
     * that are not actually in the box. They get reclassified from returned to
     * missing on the `BoxContentReturn` and logged as a huomio — the box is still
     * shelved (RETURNED) either way.
     */
    boxVerifications?: Array<{
      reservationId: string;
      missing: Array<{ itemId: string; amount: number }>;
    }>;
  };

  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      reservations: {
        select: {
          id: true,
          status: true,
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

  // Apply the admin's per-content missing flags for the boxes being shelved. A
  // flagged unit moves from returnedAmount to missingAmount on its
  // BoxContentReturn, clamped to what is still counted as returned.
  const boxReturnUpdates: Prisma.PrismaPromise<unknown>[] = [];
  const missingNotes: string[] = [];
  const missingBreakdown: Array<{ reservationId: string; itemId: string; amount: number }> = [];

  for (const entry of Array.isArray(boxVerifications) ? boxVerifications : []) {
    if (!targetIds.includes(entry.reservationId)) continue;
    const reservation = eligible.find((r) => r.id === entry.reservationId);
    if (!reservation) continue;
    const contents = boxContents(reservation.item.asLocation, loan.id);
    if (contents.length === 0) continue; // not a box
    const priorById = new Map(reservation.boxContentReturns.map((p) => [p.itemId, p]));

    const gone: string[] = [];
    for (const { itemId, amount } of Array.isArray(entry.missing) ? entry.missing : []) {
      const prior = priorById.get(itemId);
      const content = contents.find((c) => c.id === itemId);
      if (!prior || !content) continue;
      const move = Math.max(0, Math.min(Math.floor(amount), prior.returnedAmount));
      if (move === 0) continue;
      boxReturnUpdates.push(
        prisma.boxContentReturn.update({
          where: { reservationId_itemId: { reservationId: reservation.id, itemId } },
          data: {
            returnedAmount: { decrement: move },
            missingAmount: { increment: move },
          },
        }),
      );
      missingBreakdown.push({ reservationId: reservation.id, itemId, amount: move });
      gone.push(`${content.name} (${move} kpl)`);
    }
    if (gone.length > 0) {
      missingNotes.push(`Puuttui tarkistuksessa laatikosta "${reservation.item.name}": ${gone.join(', ')}`);
    }
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

  // The status flip and the box-content writes land together: a half-applied
  // shelving would mark a box RETURNED without its missing flags, or vice versa.
  const loanUpdate = prisma.loan.update({
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

  const [result] = await prisma.$transaction([loanUpdate, ...boxReturnUpdates]);

  if (missingNotes.length > 0) {
    await prisma.report.create({
      data: {
        loanId: id,
        content: missingNotes.join('\n'),
        created: 'AFTER_LOAN',
      },
    });
  }

  await logLoanHistory({
    loanId: id,
    action: 'PROCESSED_FROM_BOX',
    ...resolveLoanActor(session),
    details: {
      reservationIds: targetIds,
      count: targetIds.length,
      newStatus: newLoanStatus,
      // Units flagged missing during the shelving check, for the audit trail.
      ...(missingBreakdown.length > 0 ? { missing: missingBreakdown } : {}),
    },
  });

  return NextResponse.json(result);
}
