import { LoanStatus, ReservationStatus, LoanHistoryAction } from '@prisma/client';

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
