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
     * The admin's shelving check for each box being returned: the final count of
     * how many of each content are missing, as the box actually shows. The route
     * compares it to the borrower's record and moves units either way on the
     * `BoxContentReturn` — more missing, or some found again — logging the change
     * as a huomio. The box is shelved (RETURNED) regardless.
     */
    boxVerifications?: Array<{
      reservationId: string;
      contents: Array<{ itemId: string; missing: number }>;
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

  // Apply the admin's final per-content counts for the boxes being shelved. Each
  // content's BoxContentReturn is set to that count (missing = the admin's
  // number, returned = the rest of its amount); only contents whose missing
  // actually changed are written and logged, either as newly missing or found.
  const boxReturnUpdates: Prisma.PrismaPromise<unknown>[] = [];
  const notes: string[] = [];
  const changeBreakdown: Array<{
    reservationId: string;
    itemId: string;
    missing: number;
    delta: number;
  }> = [];

  for (const entry of Array.isArray(boxVerifications) ? boxVerifications : []) {
    if (!targetIds.includes(entry.reservationId)) continue;
    const reservation = eligible.find((r) => r.id === entry.reservationId);
    if (!reservation) continue;
    const contents = boxContents(reservation.item.asLocation, loan.id);
    if (contents.length === 0) continue; // not a box
    const priorById = new Map(reservation.boxContentReturns.map((p) => [p.itemId, p]));

    const gone: string[] = [];
    const found: string[] = [];
    for (const { itemId, missing } of Array.isArray(entry.contents) ? entry.contents : []) {
      const content = contents.find((c) => c.id === itemId);
      if (!content || content.outOnLoan) continue;
      const finalMissing = Math.max(0, Math.min(Math.floor(missing ?? 0), content.amount));
      const priorMissing = priorById.get(itemId)?.missingAmount ?? 0;
      if (finalMissing === priorMissing) continue; // unchanged
      boxReturnUpdates.push(
        prisma.boxContentReturn.upsert({
          where: { reservationId_itemId: { reservationId: reservation.id, itemId } },
          create: {
            reservationId: reservation.id,
            itemId,
            returnedAmount: content.amount - finalMissing,
            missingAmount: finalMissing,
          },
          update: {
            returnedAmount: content.amount - finalMissing,
            missingAmount: finalMissing,
          },
        }),
      );
      const delta = finalMissing - priorMissing;
      changeBreakdown.push({ reservationId: reservation.id, itemId, missing: finalMissing, delta });
      if (delta > 0) gone.push(`${content.name} (${delta} kpl)`);
      else found.push(`${content.name} (${-delta} kpl)`);
    }
    if (gone.length > 0) {
      notes.push(`Puuttui tarkistuksessa laatikosta "${reservation.item.name}": ${gone.join(', ')}`);
    }
    if (found.length > 0) {
      notes.push(`Löytyi tarkistuksessa laatikosta "${reservation.item.name}": ${found.join(', ')}`);
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

  if (notes.length > 0) {
    await prisma.report.create({
      data: {
        loanId: id,
        content: notes.join('\n'),
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
      // Per-content changes made during the shelving check, for the audit trail.
      ...(changeBreakdown.length > 0 ? { boxChanges: changeBreakdown } : {}),
    },
  });

  return NextResponse.json(result);
}
