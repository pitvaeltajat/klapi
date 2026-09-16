import { Prisma, ReservationStatus } from '@prisma/client';

/**
 * Reusable Prisma fragments for loan queries — the loan equivalent of
 * `utils/itemQueries.ts`. Keeping these in one place means a page can't quietly
 * fetch a different shape than the component it renders expects.
 */

/**
 * Loans that have not been soft-deleted. Use it in every listing, availability
 * sum and cron sweep: a deleted loan is meant to be invisible everywhere except
 * its own page, where an admin can restore it (`loan/deleteLoan`).
 */
export const activeLoansWhere = {
  deletedAt: null,
} as const satisfies Prisma.LoanWhereInput;

/**
 * The same rule, as a filter on a Reservation query — "the loan behind this
 * reservation is still live". Reservations of a deleted loan keep their
 * statuses (that is what makes a restore exact), so anything counting
 * reservations has to skip them explicitly.
 */
export const activeLoanReservationWhere = {
  loan: activeLoansWhere,
} as const satisfies Prisma.ReservationWhereInput;

/**
 * The condition-report fields the loan list and account page render. Never the
 * full record: reports carry free-text that can name people, and neither view
 * shows more than this summary.
 */
export const reportSummarySelect = {
  id: true,
  content: true,
  createdAt: true,
  created: true,
  status: true,
} as const satisfies Prisma.ReportSelect;

/**
 * A loan with everything the kiosk return/start-loan flows need: who it belongs
 * to, and the full item record behind each reservation (those views show item
 * details inline, so `select`ing a subset here would not be enough).
 */
const contentItemsSelect = {
  where: { deletedAt: null },
  select: {
    id: true,
    name: true,
    amount: true,
    // A kama inside a box can be out on a loan of its own: lending the box does
    // not take what somebody had already borrowed out of it, so the box left
    // the varasto one vasara short. Neither the pickup nor the return should
    // expect that vasara to be inside — see `utils/boxContents.ts`, which turns
    // these rows into that answer.
    reservations: {
      where: {
        status: { in: [ReservationStatus.ACCEPTED, ReservationStatus.INUSE] },
        loan: activeLoansWhere,
      },
      select: { loan: { select: { id: true, startTime: true, endTime: true } } },
    },
  },
} satisfies Prisma.Location$itemsArgs;

/**
 * What is inside a lainattava sijainti, for the kama that stands behind it.
 * Carried on every reservation because the pickup and return screens both need
 * it: handing over "Sininen työkalupakki" and checking it back in are both
 * really about what is in it. It is the *current* contents rather than a
 * snapshot taken when the loan was made — "what should be in here now".
 *
 * Its sub-sijainnit count too (a lokero in the pakki), since lending the pakki
 * takes them along. `flattenContents` folds the levels into one list.
 */
// ponytail: three levels of sub-sijainti; availability follows the whole tree,
// so a deeper one would go out with the box without being listed here.
export const itemBoxContentsInclude = {
  asLocation: {
    select: {
      items: contentItemsSelect,
      children: {
        select: {
          items: contentItemsSelect,
          children: {
            select: {
              items: contentItemsSelect,
              children: { select: { items: contentItemsSelect } },
            },
          },
        },
      },
    },
  },
} as const satisfies Prisma.ItemInclude;

export const loanWithReservationsInclude = {
  user: true,
  reservations: { include: { item: { include: itemBoxContentsInclude } } },
} as const satisfies Prisma.LoanInclude;

/**
 * The per-user notification toggles, as shown on the account page — the email
 * ones plus the calendar invite, which sits in the same section of `/account`.
 */
export const notificationPreferenceSelect = {
  emailWeeklyReminder: true,
  emailNewLoanNotification: true,
  emailExpiringReminder: true,
  emailOldBoxNotification: true,
  emailOverdueNotification: true,
  calendarLoanEvents: true,
} as const satisfies Prisma.UserSelect;
