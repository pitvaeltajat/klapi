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

export const getLoanStatusLabel = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return 'Hyväksytty';
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
      return 'Hyväksytty';
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
