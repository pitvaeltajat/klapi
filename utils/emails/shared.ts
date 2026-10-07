import { ReservationStatus } from '@prisma/client';
import prisma from '@/utils/prisma';

/**
 * Reservation statuses that no longer owe the troop anything: back in the box,
 * checked in, or never handed out. The overdue sweep and the overdue mail's
 * item list both key on this, so they agree on what "still out" means.
 */
export const SETTLED_RESERVATION_STATUSES = [
  ReservationStatus.IN_BOX,
  ReservationStatus.RETURNED,
  ReservationStatus.REJECTED,
] as const;

/** A rendered email, ready to hand to `sendEmail`. */
export interface EmailContent {
  subject: string;
  html: string;
}

/** Outcome of a single send, tallied into the cron routes' JSON response. */
export type EmailOutcome = 'sent' | 'failed';

/**
 * Run one email send, logging and swallowing failures. The cron sweeps send a
 * batch of independent emails, and one bad address (or a flaky SES) must not
 * stop the rest — the outcome is reported in the response instead.
 */
export async function trySendEmail(
  label: string,
  send: () => Promise<void>,
): Promise<EmailOutcome> {
  try {
    await send();
    console.log(`Sent ${label}`);
    return 'sent';
  } catch (error) {
    console.error(`Error sending ${label}:`, error);
    return 'failed';
  }
}

/**
 * The loan fields every per-loan template renders from.
 *
 * Templates take this instead of querying themselves so `scripts/preview-emails.ts`
 * can render the real templates with sample data, without a database.
 */
export interface LoanEmailData {
  description: string | null;
  startTime: Date | string;
  endTime: Date | string;
  items: { id: string; name: string; amount: number }[];
}

/**
 * Load the loan data the per-loan templates need. Throws if the loan is gone —
 * callers treat that as a send failure.
 *
 * `outstandingOnly` leaves out the kamat already back (or rejected), for the
 * overdue mail: after a partial return it must list what is still missing,
 * not tell the borrower to bring back what they already did.
 */
export async function getLoanEmailData(
  loanId: string,
  { outstandingOnly = false }: { outstandingOnly?: boolean } = {},
): Promise<LoanEmailData> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      description: true,
      startTime: true,
      endTime: true,
      reservations: {
        ...(outstandingOnly && {
          where: { status: { notIn: [...SETTLED_RESERVATION_STATUSES] } },
        }),
        include: {
          item: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!loan) {
    throw new Error(`Loan ${loanId} not found`);
  }

  return {
    description: loan.description,
    startTime: loan.startTime,
    endTime: loan.endTime,
    // The card shows the reserved amount, not the item's total stock.
    items: loan.reservations.map((r) => ({ id: r.item.id, name: r.item.name, amount: r.amount })),
  };
}
