/**
 * Every outgoing email lives in this directory: one module per message, each
 * exporting a pure `render*Email` (template + subject) and a `send*Email` that
 * loads the data and hands the result to SES.
 *
 * Callers (loan routes, cron jobs) import the senders from here and call them
 * in-process; `scripts/preview-emails.ts` imports the renderers.
 */
export { renderAdminReminderEmail, sendAdminReminderEmail } from './adminReminder';
export type { BoxLoanCard, BoxLoanInfo } from './adminReminder';

export { renderNewLoanEmail, sendNewLoanEmail } from './newLoanToAdmin';
export type { NewLoanAdminEmailData } from './newLoanToAdmin';

export { renderCreatedEmail, sendCreatedEmail } from './newLoanToUser';

export { renderOverdueAdminEmail, sendOverdueAdminEmail } from './overdueToAdmin';
export type { OverdueLoanCard, OverdueLoanInfo } from './overdueToAdmin';

export { renderOverdueEmail, sendOverdueEmail } from './overdueToUser';

export { renderPickupOverdueEmail, sendPickupOverdueEmail } from './pickupOverdue';

export { renderPickupReminderEmail, sendPickupReminderEmail } from './pickupReminder';

export { renderReminderEmail, sendReminderEmail } from './reminder';

export { trySendEmail } from './shared';
export type { EmailContent, EmailOutcome, LoanEmailData } from './shared';
