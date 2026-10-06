/**
 * Puts back into the box the kamat that `submitLoan` wrongly marked RETURNED.
 *
 * Until fix/box-autoreturn, submitting any loan containing a kama flipped every
 * IN_BOX reservation of that kama — on any other loan, regardless of amount or
 * date — to RETURNED, without a history entry and without touching the other
 * loan's `status`/`boxId`. That leaves a tell: the reservation is RETURNED, it
 * was put in the box (`RETURNED_TO_BOX`) but never checked in
 * (`PROCESSED_FROM_BOX`), and the loan row still says IN_BOX /
 * PARTIALLY_RETURNED because nothing re-derived it. Every legitimate path
 * (`loanProcessed`, `updateLoan`) writes the loan status along with the items.
 *
 *   pnpm tsx scripts/restore-box-returns.ts            # dry run — reports, writes nothing
 *   pnpm tsx scripts/restore-box-returns.ts --apply    # writes
 */
import { LoanStatus, ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { logLoanHistory } from '@/utils/loanHistory';

const ids = (details: unknown, key: string): string[] => {
  const v = (details as Record<string, unknown> | null)?.[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
};

async function main() {
  const apply = process.argv.includes('--apply');

  const loans = await prisma.loan.findMany({
    where: {
      deletedAt: null,
      status: { in: [LoanStatus.IN_BOX, LoanStatus.PARTIALLY_RETURNED] },
      reservations: { some: { status: ReservationStatus.RETURNED } },
    },
    include: {
      reservations: { include: { item: { select: { name: true } } } },
      history: { where: { action: { in: ['RETURNED_TO_BOX', 'PROCESSED_FROM_BOX'] } } },
    },
  });

  let fixed = 0;
  for (const loan of loans) {
    const boxed = new Set(
      loan.history.filter((h) => h.action === 'RETURNED_TO_BOX').flatMap((h) => ids(h.details, 'reservationIds')),
    );
    const processed = new Set(
      loan.history.filter((h) => h.action === 'PROCESSED_FROM_BOX').flatMap((h) => ids(h.details, 'reservationIds')),
    );
    const wrong = loan.reservations.filter(
      (r) => r.status === ReservationStatus.RETURNED && boxed.has(r.id) && !processed.has(r.id),
    );
    if (wrong.length === 0) continue;

    const wrongIds = new Set(wrong.map((r) => r.id));
    const newStatus = deriveLoanStatus(
      loan.reservations.map((r) => ({ status: wrongIds.has(r.id) ? ReservationStatus.IN_BOX : r.status })),
      loan.status,
    );
    console.log(
      `${loan.id}  ${loan.status} → ${newStatus}  box=${loan.boxId ?? '-'}  ` +
        wrong.map((r) => `${r.item.name} ×${r.amount}`).join(', '),
    );
    fixed++;
    if (!apply) continue;

    await prisma.$transaction([
      prisma.reservation.updateMany({
        where: { id: { in: [...wrongIds] } },
        data: { status: ReservationStatus.IN_BOX },
      }),
      prisma.loan.update({ where: { id: loan.id }, data: { status: newStatus } }),
    ]);
    await logLoanHistory({
      loanId: loan.id,
      action: 'UPDATED',
      details: {
        statusChanges: wrong.map((r) => ({
          itemId: r.itemId,
          name: r.item.name,
          from: ReservationStatus.RETURNED,
          to: ReservationStatus.IN_BOX,
        })),
        note: 'Korjattu: toinen laina merkitsi kamat virheellisesti palautetuiksi',
      },
    });
  }

  console.log(`\n${fixed} loan(s) ${apply ? 'restored' : 'would be restored (dry run; --apply to write)'}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
