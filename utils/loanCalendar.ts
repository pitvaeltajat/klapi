import { after } from 'next/server';
import { LoanStatus } from '@prisma/client';
import prisma from '@/utils/prisma';
import {
  CalendarEventGone,
  googleCalendar,
  isCalendarConfigured,
  type CalendarClient,
  type CalendarEventInput,
} from '@/utils/googleCalendar';
import { getPublicUrl } from '@/utils/urlHelpers';

/**
 * Mirrors loans onto the troop's shared Google Calendar.
 *
 * One event per loan, on one shared calendar (`GOOGLE_CALENDAR_ID`) that the
 * whole troop can subscribe to — "what is out, and until when". The borrower is
 * added as a **guest**, which is what puts the loan in their own calendar too;
 * that half is opt-out per person (`User.calendarLoanEvents`), and only ever
 * applies to a real Workspace account. The fleet-wide record stays either way.
 *
 * `syncLoanCalendar` is the only entry point, and it reconciles rather than
 * commands: it looks at the loan as it is now and makes the calendar agree.
 * Every route that creates, edits, cancels or rejects a loan calls it — the
 * same call, whatever changed — so there is no per-route bookkeeping about
 * which field moved. `Loan.calendarEventId` is the link between the two.
 *
 * It is called from `after()` (see `syncLoanCalendarInBackground`): the loan is
 * already committed by then, and Google being slow or down must not fail — or
 * even slow — the request that saved it.
 */

/** Loans in these states have no business being on the calendar at all. */
const OFF_CALENDAR: LoanStatus[] = [LoanStatus.CANCELLED, LoanStatus.REJECTED];

/**
 * The troop is in Helsinki and so is every loan. Sending the zone (rather than
 * only a UTC instant) is what makes an event survive a DST change with its
 * wall-clock time intact.
 */
const TIME_ZONE = 'Europe/Helsinki';

export type LoanCalendarOutcome = 'created' | 'updated' | 'deleted' | 'skipped';

/** Just enough of a loan to render its event. */
type LoanForCalendar = {
  id: string;
  status: LoanStatus;
  startTime: Date;
  endTime: Date;
  description: string | null;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
    group: string;
    deletedAt: Date | null;
    calendarLoanEvents: boolean;
  };
  reservations: { amount: number; item: { name: string } }[];
};

/**
 * Whether this person's own calendar may be invited: a live Workspace account
 * that hasn't opted out. Personal Gmail logins and the shared kiosk terminal
 * are out — the kiosk's calendar is nobody's, and inviting a stranger's private
 * Gmail to a troop event is not ours to do.
 */
function attendeeFor(user: LoanForCalendar['user']): { email: string }[] | undefined {
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN?.toLowerCase();
  const email = user.email?.toLowerCase();

  if (!domain || !email || user.group === 'KIOSK' || !user.calendarLoanEvents) return undefined;
  // A soft-deleted account is a departed member: their old loans stay on the
  // shared calendar, but nothing new goes to a mailbox that may be gone.
  if (user.deletedAt) return undefined;
  if (!email.endsWith(`@${domain}`)) return undefined;

  return [{ email }];
}

/** "1 kama" / "3 kamaa" — the fallback title when a loan has no description. */
function itemCountLabel(count: number): string {
  return count === 1 ? '1 kama' : `${count} kamaa`;
}

/**
 * Who the event is titled after.
 *
 * `Loan.loaner` is free text: the kiosk asks whoever is at the terminal to type
 * a name, but the self-service cart used to fill it with the signed-in *address*
 * in preference to the name (`components/CartDrawer.tsx`), so loans made before
 * that was fixed carry one. An address is a poor event title — "Melontaviikko"
 * on the troop calendar should say who has the trailer, not which mailbox — and
 * when the address is merely this account's own, the account's name says the
 * same thing and reads like a person.
 *
 * Only that exact case is substituted. A `loaner` that differs from the account
 * is someone the operator deliberately named — a patrol, a person borrowing on
 * another's card — and is left alone whatever it looks like.
 */
function loanerLabel(loan: LoanForCalendar): string {
  const loaner = loan.loaner?.trim();
  const name = loan.user.name?.trim();
  const email = loan.user.email?.trim();

  const loanerIsOwnAddress = Boolean(
    loaner && email && loaner.toLowerCase() === email.toLowerCase(),
  );
  if (loaner && !loanerIsOwnAddress) return loaner;

  return name || loaner || email || 'Tuntematon';
}

/** The event body for one loan. Pure, so the wording is testable. */
export function buildLoanEvent(loan: LoanForCalendar): CalendarEventInput {
  const who = loanerLabel(loan);
  const what = loan.description?.trim() || itemCountLabel(loan.reservations.length);
  const loanUrl = `${getPublicUrl()}/loan/${loan.id}`;

  const items = loan.reservations.map((r) => `• ${r.amount} × ${r.item.name}`).join('\n');
  const attendees = attendeeFor(loan.user);

  return {
    summary: `${who}: ${what}`,
    description: [items, '', `Avaa laina Klapissa: ${loanUrl}`].join('\n'),
    start: { dateTime: loan.startTime.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: loan.endTime.toISOString(), timeZone: TIME_ZONE },
    ...(attendees ? { attendees } : {}),
    // A loan is not a meeting: it must not block the borrower's free/busy, and
    // a guest has no reason to edit it or invite anyone else to it.
    transparency: 'transparent',
    guestsCanInviteOthers: false,
    guestsCanModify: false,
    source: { title: 'Klapi', url: loanUrl },
  };
}

/**
 * Makes the calendar agree with the loan as it currently stands: creates the
 * event, updates it, or removes it when the loan was cancelled or rejected.
 * Safe to call after any change, and safe to call twice.
 *
 * @param client injected by the tests; production passes nothing and gets the
 *   real calendar, or a no-op when `GOOGLE_CALENDAR_ID` is unset.
 */
export async function syncLoanCalendar(
  loanId: string,
  client?: CalendarClient,
): Promise<LoanCalendarOutcome> {
  const calendar = client ?? (isCalendarConfigured() ? googleCalendar : null);
  if (!calendar) return 'skipped';

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      id: true,
      status: true,
      deletedAt: true,
      startTime: true,
      endTime: true,
      description: true,
      loaner: true,
      calendarEventId: true,
      user: {
        select: {
          name: true,
          email: true,
          group: true,
          deletedAt: true,
          calendarLoanEvents: true,
        },
      },
      reservations: { select: { amount: true, item: { select: { name: true } } } },
    },
  });
  if (!loan) return 'skipped';

  // A soft-deleted loan is off the calendar for the same reason a cancelled one
  // is: as far as the troop is concerned it isn't happening.
  if (loan.deletedAt || OFF_CALENDAR.includes(loan.status)) {
    if (!loan.calendarEventId) return 'skipped';
    await calendar.deleteEvent(loan.calendarEventId);
    await prisma.loan.update({ where: { id: loan.id }, data: { calendarEventId: null } });
    return 'deleted';
  }

  const event = buildLoanEvent(loan);

  if (loan.calendarEventId) {
    try {
      await calendar.patchEvent(loan.calendarEventId, event);
      return 'updated';
    } catch (error) {
      // Somebody deleted the event by hand. Fall through and make a new one
      // rather than leaving the loan permanently unmirrored.
      if (!(error instanceof CalendarEventGone)) throw error;
    }
  }

  const eventId = await calendar.createEvent(event);
  await prisma.loan.update({ where: { id: loan.id }, data: { calendarEventId: eventId } });
  return 'created';
}

/**
 * Fire-and-forget `syncLoanCalendar`, for route handlers. Runs after the
 * response is sent and swallows failures: the loan is already saved, and a
 * calendar that didn't get the memo is fixed by the next edit — or by hand.
 */
export function syncLoanCalendarInBackground(loanId: string): void {
  after(async () => {
    try {
      await syncLoanCalendar(loanId);
    } catch (error) {
      console.error(`Failed to sync loan ${loanId} to the calendar:`, error);
    }
  });
}

/**
 * Whether it is worth showing this person the "lainat kalenteriisi" toggle —
 * i.e. whether the mirror is configured at all and their account is one the
 * calendar can invite. Keeps `/account` from offering a switch that does
 * nothing for a Gmail login.
 */
export function canReceiveLoanCalendarEvents(email: string | null, group: string): boolean {
  if (!isCalendarConfigured()) return false;
  return Boolean(
    attendeeFor({ name: null, email, group, deletedAt: null, calendarLoanEvents: true }),
  );
}
