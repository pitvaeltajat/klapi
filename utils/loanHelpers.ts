import {
  LoanStatus,
  ReservationStatus,
  LoanHistoryAction,
  ReportStatus,
  ReportCreated,
  AnnouncementKind,
} from '@prisma/client';

export const getLoanHistoryActionLabel = (action: LoanHistoryAction): string => {
  switch (action) {
    case 'CREATED':
      return 'Laina luotu';
    case 'UPDATED':
      return 'Lainaa muokattu';
    case 'APPROVED':
      return 'Laina hyväksytty';
    case 'REJECTED':
      return 'Laina hylätty';
    case 'CANCELLED':
      return 'Laina peruttu';
    case 'STARTED':
      return 'Lainaus aloitettu';
    case 'RETURNED_TO_BOX':
      return 'Kamat palautettu laatikkoon';
    case 'PROCESSED_FROM_BOX':
      return 'Kamat merkitty palautetuksi';
    case 'DELETED':
      return 'Laina poistettu';
    case 'RESTORED':
      return 'Laina palautettu';
    default:
      return action;
  }
};

/**
 * ACCEPTED reads **Varattu**, not "Hyväksytty". `submitLoan` creates every loan
 * ACCEPTED and there is no approval queue, so nobody ever approved it — the
 * word promised a review that does not happen. "Varattu" is what the state
 * actually is: the kamat are held for you and not yet picked up.
 * (`LoanHistoryAction.APPROVED` keeps its "hyväksytty" wording — that one *is*
 * an admin acting, un-rejecting a rejected loan.)
 */
export const getLoanStatusLabel = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return 'Varattu';
    case LoanStatus.REJECTED:
      return 'Hylätty';
    case LoanStatus.CANCELLED:
      return 'Peruttu';
    case LoanStatus.INUSE:
      return 'Käytössä';
    case LoanStatus.IN_BOX:
      return 'Laatikossa';
    case LoanStatus.PARTIALLY_RETURNED:
      return 'Osittain palautettu';
    case LoanStatus.RETURNED:
      return 'Palautettu';
    default:
      return 'Tuntematon';
  }
};

/**
 * Who a loan is labelled by, everywhere it is shown.
 *
 * `loaner` is the free-text name a kiosk operator or an admin typed in, so it
 * is empty on a loan somebody made for themselves — there the account is the
 * answer. Every surface naming a borrower has to fall through the same three,
 * or a loan renders with a blank "Lainaaja:" (which `/return` did until this
 * existed, for exactly the loans nobody typed a name into).
 */
export const getLoanerName = (loan: {
  loaner?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
}): string =>
  loan.loaner?.trim() || loan.user?.name || loan.user?.email || 'Tuntematon lainaaja';

/**
 * Who actually entered a loan, when that is not simply its owner.
 *
 * A loan made at the kaluston kone belongs to whoever the operator named in the
 * Lainaaja field, so a page can always say *whose* loan it is — but not who was
 * standing at the machine. That only exists on the CREATED history entry, where
 * `resolveLoanActor` has already unwrapped a PIN elevation into the admin
 * behind it. Surfacing it saves opening the history to answer "who booked this
 * for me?".
 *
 * Returns null for the ordinary case: you made your own loan.
 */
export interface LoanCreatorEntry {
  action: LoanHistoryAction;
  details: unknown;
  actedBy: { id: string; name: string | null; email: string | null; group?: string } | null;
}

export const hasDetailFlag = (details: unknown, key: string): boolean =>
  typeof details === 'object' &&
  details !== null &&
  key in details &&
  (details as Record<string, unknown>)[key] === true;

export function getLoanCreator(
  history: LoanCreatorEntry[],
  ownerId: string,
): { name: string | null; viaKiosk: boolean } | null {
  const created = history.find((entry) => entry.action === 'CREATED');
  if (!created) return null;

  const viaKiosk = hasDetailFlag(created.details, 'viaKiosk');
  const actor = created.actedBy;

  // The kiosk's own account is a machine, not a person — name the machine.
  if (actor?.group === 'KIOSK') return { name: null, viaKiosk: true };
  if (!actor) return viaKiosk ? { name: null, viaKiosk: true } : null;
  if (actor.id === ownerId && !viaKiosk) return null;

  return { name: actor.name || actor.email, viaKiosk };
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'outline-solid'
  | 'gray';

export const getLoanStatusColor = (status: LoanStatus): BadgeVariant => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return 'success';
    case LoanStatus.REJECTED:
      return 'destructive';
    case LoanStatus.CANCELLED:
      return 'gray';
    case LoanStatus.INUSE:
      return 'default';
    case LoanStatus.IN_BOX:
      return 'secondary';
    case LoanStatus.PARTIALLY_RETURNED:
      return 'warning';
    case LoanStatus.RETURNED:
      return 'gray';
    default:
      return 'gray';
  }
};

export const getReservationStatusLabel = (status: ReservationStatus): string => {
  switch (status) {
    case ReservationStatus.ACCEPTED:
      return 'Varattu';
    case ReservationStatus.REJECTED:
      return 'Hylätty';
    case ReservationStatus.INUSE:
      return 'Käytössä';
    case ReservationStatus.IN_BOX:
      return 'Laatikossa';
    case ReservationStatus.RETURNED:
      return 'Palautettu';
    default:
      return 'Tuntematon';
  }
};

export const getReservationStatusColor = (status: ReservationStatus): BadgeVariant => {
  switch (status) {
    case ReservationStatus.ACCEPTED:
      return 'success';
    case ReservationStatus.REJECTED:
      return 'destructive';
    case ReservationStatus.INUSE:
      return 'default';
    case ReservationStatus.IN_BOX:
      return 'secondary';
    case ReservationStatus.RETURNED:
      return 'gray';
    default:
      return 'gray';
  }
};

/**
 * The UI calls both `Report` and `Announcement` a **huomio** — something
 * noticed about a kama. A Report is the unpublished one a loaner writes about a
 * loan; an Announcement is the published one every loaner sees on the kama.
 * These helpers are the single source of that vocabulary, so the same state
 * never reads as two different things on two pages.
 *
 * OPEN and IN_PROGRESS both mean "still on the admin's plate"; the difference
 * is only whether someone has claimed it, so IN_PROGRESS is the *calmer* badge.
 */
export const getReportStatusLabel = (status: ReportStatus | string): string => {
  switch (status) {
    case ReportStatus.OPEN:
      return 'Uusi';
    case ReportStatus.IN_PROGRESS:
      return 'Selvityksessä';
    case ReportStatus.RESOLVED:
      return 'Hoidettu';
    default:
      return 'Tuntematon';
  }
};

export const getReportStatusColor = (status: ReportStatus | string): BadgeVariant => {
  switch (status) {
    case ReportStatus.OPEN:
      return 'destructive';
    case ReportStatus.IN_PROGRESS:
      return 'warning';
    case ReportStatus.RESOLVED:
      return 'success';
    default:
      return 'gray';
  }
};

/** When the loaner wrote it — at pickup, or when returning the gear. */
export const getReportCreatedLabel = (created: ReportCreated | string): string =>
  created === ReportCreated.AFTER_LOAN ? 'Palautettaessa' : 'Noudettaessa';

/**
 * A published huomio is either a fault (red, carries the fix-it lifecycle) or a
 * neutral heads-up that simply stands until an admin removes it. Everything a
 * loaner writes starts life as a fault; most admin-written notices don't.
 */
export const getAnnouncementKindLabel = (kind: AnnouncementKind | string): string =>
  kind === AnnouncementKind.KORJATTAVAA ? 'Korjattavaa' : 'Tiedoksi';

export const getAnnouncementKindColor = (kind: AnnouncementKind | string): BadgeVariant =>
  kind === AnnouncementKind.KORJATTAVAA ? 'destructive' : 'secondary';

/**
 * Derives the overall loan status from its reservations.
 *
 * Priority order:
 * 0. Loan-level CANCELLED -> CANCELLED (cancelled loans keep REJECTED
 *    reservations, so this must be checked before the reservation rules)
 * 1. All RETURNED -> RETURNED
 * 2. All REJECTED -> REJECTED
 * 3. Mix of INUSE + (IN_BOX or RETURNED) -> PARTIALLY_RETURNED
 * 4. Any INUSE -> INUSE (remaining non-INUSE are ACCEPTED/REJECTED)
 * 5. Any IN_BOX -> IN_BOX
 * 6. Otherwise -> loan's DB status
 */
export const deriveLoanStatus = (
  reservations: { status: ReservationStatus }[],
  loanStatus: LoanStatus,
): LoanStatus => {
  if (loanStatus === LoanStatus.CANCELLED) return LoanStatus.CANCELLED;
  if (reservations.length === 0) return loanStatus;

  if (reservations.every((r) => r.status === ReservationStatus.RETURNED)) {
    return LoanStatus.RETURNED;
  }
  if (reservations.every((r) => r.status === ReservationStatus.REJECTED)) {
    return LoanStatus.REJECTED;
  }

  const hasInuse = reservations.some((r) => r.status === ReservationStatus.INUSE);
  const hasInBox = reservations.some((r) => r.status === ReservationStatus.IN_BOX);
  const hasReturned = reservations.some((r) => r.status === ReservationStatus.RETURNED);

  if (hasInuse && (hasInBox || hasReturned)) {
    return LoanStatus.PARTIALLY_RETURNED;
  }
  if (hasInuse) {
    return LoanStatus.INUSE;
  }
  if (hasInBox) {
    return LoanStatus.IN_BOX;
  }

  return loanStatus;
};

/** Whole days past the return date. 0 while the loan is still due today. */
export const daysOverdue = (endTime: Date | string): number =>
  Math.max(0, Math.floor((Date.now() - new Date(endTime).getTime()) / 86_400_000));

/**
 * A loan whose kamat are still out after its return date. Only the two statuses
 * that mean "not back yet" count — a loan sitting in the palautuslaatikko has
 * been brought back, it just hasn't been checked in, and nobody should be
 * chased for it.
 */
export const isLoanOverdue = (loan: {
  status: LoanStatus;
  endTime: Date | string;
  deletedAt?: Date | string | null;
  reservations: { status: ReservationStatus }[];
}): boolean => {
  if (loan.deletedAt) return false;
  const derived = deriveLoanStatus(loan.reservations, loan.status);
  if (derived !== LoanStatus.INUSE && derived !== LoanStatus.ACCEPTED) return false;
  return new Date(loan.endTime) < new Date();
};

/**
 * The statuses an admin may set on a loan by hand (`loan/updateLoan`), and the
 * reservation status every line of the loan takes when they do.
 *
 * PARTIALLY_RETURNED is absent on purpose: it is *derived* from a mix of
 * reservation statuses, so there is no single value to flatten the lines to.
 */
export const MANUAL_LOAN_STATUSES = {
  [LoanStatus.ACCEPTED]: ReservationStatus.ACCEPTED,
  [LoanStatus.REJECTED]: ReservationStatus.REJECTED,
  [LoanStatus.CANCELLED]: ReservationStatus.REJECTED,
  [LoanStatus.INUSE]: ReservationStatus.INUSE,
  [LoanStatus.IN_BOX]: ReservationStatus.IN_BOX,
  [LoanStatus.RETURNED]: ReservationStatus.RETURNED,
} as const;

export type ManualLoanStatus = keyof typeof MANUAL_LOAN_STATUSES;

export const isManualLoanStatus = (value: unknown): value is ManualLoanStatus =>
  typeof value === 'string' && value in MANUAL_LOAN_STATUSES;
