import { LoanStatus, ReservationStatus } from '@prisma/client';

export const getLoanStatusLabel = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return 'Hyväksytty';
    case LoanStatus.REJECTED:
      return 'Hylätty';
    case LoanStatus.INUSE:
      return 'Käytössä';
    case LoanStatus.IN_BOX:
      return 'Laatikossa';
    case LoanStatus.RETURNED:
      return 'Palautettu';
    default:
      return 'Tuntematon';
  }
};

export const getLoanStatusColor = (status: LoanStatus): string => {
  switch (status) {
    case LoanStatus.ACCEPTED:
      return 'green';
    case LoanStatus.REJECTED:
      return 'red';
    case LoanStatus.INUSE:
      return 'blue';
    case LoanStatus.IN_BOX:
      return 'purple';
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

export const getReservationStatusColor = (status: ReservationStatus): string => {
  switch (status) {
    case ReservationStatus.ACCEPTED:
      return 'green';
    case ReservationStatus.REJECTED:
      return 'red';
    case ReservationStatus.INUSE:
      return 'blue';
    case ReservationStatus.IN_BOX:
      return 'purple';
    case ReservationStatus.RETURNED:
      return 'gray';
    default:
      return 'gray';
  }
};

/**
 * Derives the overall loan status from its reservations.
 * Priority order:
 * 1. If all reservations are RETURNED -> RETURNED
 * 2. If all reservations are REJECTED -> REJECTED
 * 3. If any reservation is IN_BOX -> IN_BOX
 * 4. If any reservation is INUSE -> INUSE
 * 5. Otherwise -> ACCEPTED
 */
export const deriveLoanStatus = (
  reservations: { status: ReservationStatus }[],
): LoanStatus => {
  if (reservations.length === 0) return LoanStatus.ACCEPTED;

  if (reservations.every((r) => r.status === ReservationStatus.RETURNED)) {
    return LoanStatus.RETURNED;
  }
  if (reservations.every((r) => r.status === ReservationStatus.REJECTED)) {
    return LoanStatus.REJECTED;
  }
  if (reservations.some((r) => r.status === ReservationStatus.IN_BOX)) {
    return LoanStatus.IN_BOX;
  }
  if (reservations.some((r) => r.status === ReservationStatus.INUSE)) {
    return LoanStatus.INUSE;
  }

  return LoanStatus.ACCEPTED;
};
