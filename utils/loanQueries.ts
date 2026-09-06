import { Prisma } from '@prisma/client';

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
export const loanWithReservationsInclude = {
  user: true,
  reservations: { include: { item: true } },
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
