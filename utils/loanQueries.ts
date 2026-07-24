import { Prisma } from '@prisma/client';

/**
 * Reusable Prisma fragments for loan queries — the loan equivalent of
 * `utils/itemQueries.ts`. Keeping these in one place means a page can't quietly
 * fetch a different shape than the component it renders expects.
 */

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

/** The per-user email toggles, as shown on the account page. */
export const emailPreferenceSelect = {
  emailWeeklyReminder: true,
  emailNewLoanNotification: true,
  emailExpiringReminder: true,
  emailOldBoxNotification: true,
  emailOverdueNotification: true,
} as const satisfies Prisma.UserSelect;
