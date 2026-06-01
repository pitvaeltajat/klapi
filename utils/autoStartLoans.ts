import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { logLoanHistory } from '@/utils/loanHistory';

/**
 * Promotes every ACCEPTED loan whose booking window has begun
 * (`startTime <= now`) to INUSE, flipping its still-ACCEPTED reservations to
 * INUSE as well — the same transition `loan/startLoan` performs manually, but
 * triggered automatically by the clock instead of a person.
 *
 * Notes:
 * - `startTime` is left untouched (manual start stamps it to "now"; here the
 *   booking's own scheduled start is the trigger, so the original time is the
 *   truth).
 * - REJECTED reservations on partially-approved loans are left alone — only
 *   ACCEPTED lines become INUSE.
 * - Idempotent: the loan-status flip is guarded so a loan is only processed
 *   while it is still ACCEPTED. A second (or concurrent) run finds nothing to
 *   do, so a double cron fire won't double-log history.
 *
 * `options.userIds` narrows the sweep to specific owners — the cron runs it
 * unscoped (all users), but it keeps tests isolated from each other's loans and
 * leaves room for a future "start this person's due loans now" action.
 *
 * Returns the ids of the loans that were started.
 */
export async function startDueLoans(
  now: Date = new Date(),
  options: { userIds?: string[] } = {},
): Promise<string[]> {
  const due = await prisma.loan.findMany({
    where: {
      status: LoanStatus.ACCEPTED,
      startTime: { lte: now },
      ...(options.userIds ? { userId: { in: options.userIds } } : {}),
    },
    select: { id: true },
  });

  const startedIds: string[] = [];

  for (const { id } of due) {
    // Claim the loan with a conditional update: if another runner already moved
    // it out of ACCEPTED, count is 0 and we skip it.
    const claim = await prisma.loan.updateMany({
      where: { id, status: LoanStatus.ACCEPTED },
      data: { status: LoanStatus.INUSE },
    });
    if (claim.count === 0) continue;

    await prisma.reservation.updateMany({
      where: { loanId: id, status: ReservationStatus.ACCEPTED },
      data: { status: ReservationStatus.INUSE },
    });

    await logLoanHistory({
      loanId: id,
      action: 'STARTED',
      actedById: null,
      details: { auto: true },
    });

    startedIds.push(id);
  }

  return startedIds;
}
