import { describe, it, expect } from 'vitest';
import { ReservationStatus, LoanStatus } from '@prisma/client';
import {
  deriveLoanStatus,
  getLoanStatusLabel,
  getLoanStatusColor,
  getReservationStatusLabel,
  getReservationStatusColor,
} from '../utils/loanHelpers';

describe('deriveLoanStatus', () => {
  it('should return ACCEPTED for empty reservations', () => {
    expect(deriveLoanStatus([], LoanStatus.ACCEPTED)).toBe(LoanStatus.ACCEPTED);
  });

  it('should return RETURNED when all reservations are RETURNED', () => {
    const reservations = [
      { status: ReservationStatus.RETURNED },
      { status: ReservationStatus.RETURNED },
      { status: ReservationStatus.RETURNED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.RETURNED);
  });

  it('should return REJECTED when all reservations are REJECTED', () => {
    const reservations = [
      { status: ReservationStatus.REJECTED },
      { status: ReservationStatus.REJECTED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.REJECTED);
  });

  it('should return IN_BOX when any reservation is IN_BOX and none are INUSE', () => {
    const reservations = [
      { status: ReservationStatus.ACCEPTED },
      { status: ReservationStatus.IN_BOX },
      { status: ReservationStatus.RETURNED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.IN_BOX);
  });

  it('should return PARTIALLY_RETURNED when some are INUSE and some are IN_BOX', () => {
    const reservations = [
      { status: ReservationStatus.INUSE },
      { status: ReservationStatus.IN_BOX },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.INUSE)).toBe(LoanStatus.PARTIALLY_RETURNED);
  });

  it('should return PARTIALLY_RETURNED when some are INUSE and some are RETURNED', () => {
    const reservations = [
      { status: ReservationStatus.INUSE },
      { status: ReservationStatus.RETURNED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.INUSE)).toBe(LoanStatus.PARTIALLY_RETURNED);
  });

  it('should return PARTIALLY_RETURNED for INUSE + IN_BOX + RETURNED mix', () => {
    const reservations = [
      { status: ReservationStatus.INUSE },
      { status: ReservationStatus.IN_BOX },
      { status: ReservationStatus.RETURNED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.INUSE)).toBe(LoanStatus.PARTIALLY_RETURNED);
  });

  it('should return INUSE when some are INUSE and rest are ACCEPTED/REJECTED only', () => {
    const reservations = [
      { status: ReservationStatus.INUSE },
      { status: ReservationStatus.REJECTED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.INUSE);
  });

  it('should return INUSE when any reservation is INUSE', () => {
    const reservations = [
      { status: ReservationStatus.ACCEPTED },
      { status: ReservationStatus.INUSE },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.INUSE);
  });

  it('should return ACCEPTED when all reservations are ACCEPTED', () => {
    const reservations = [
      { status: ReservationStatus.ACCEPTED },
      { status: ReservationStatus.ACCEPTED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.ACCEPTED);
  });

  it('should return PARTIALLY_RETURNED when mixing INUSE and IN_BOX (not plain IN_BOX)', () => {
    const reservations = [
      { status: ReservationStatus.INUSE },
      { status: ReservationStatus.IN_BOX },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.INUSE)).toBe(LoanStatus.PARTIALLY_RETURNED);
  });

  it('should not return RETURNED if any reservation is not RETURNED', () => {
    const reservations = [
      { status: ReservationStatus.RETURNED },
      { status: ReservationStatus.ACCEPTED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).not.toBe(LoanStatus.RETURNED);
  });

  it('should not return REJECTED if any reservation is not REJECTED', () => {
    const reservations = [
      { status: ReservationStatus.REJECTED },
      { status: ReservationStatus.ACCEPTED },
    ];
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).not.toBe(LoanStatus.REJECTED);
  });

  it('should handle single reservation correctly', () => {
    expect(deriveLoanStatus([{ status: ReservationStatus.ACCEPTED }], LoanStatus.ACCEPTED)).toBe(LoanStatus.ACCEPTED);
    expect(deriveLoanStatus([{ status: ReservationStatus.INUSE }], LoanStatus.ACCEPTED)).toBe(LoanStatus.INUSE);
    expect(deriveLoanStatus([{ status: ReservationStatus.IN_BOX }], LoanStatus.ACCEPTED)).toBe(LoanStatus.IN_BOX);
    expect(deriveLoanStatus([{ status: ReservationStatus.RETURNED }], LoanStatus.ACCEPTED)).toBe(LoanStatus.RETURNED);
    expect(deriveLoanStatus([{ status: ReservationStatus.REJECTED }], LoanStatus.ACCEPTED)).toBe(LoanStatus.REJECTED);
  });

  it('should handle mixed RETURNED and REJECTED as ACCEPTED (fallthrough)', () => {
    const reservations = [
      { status: ReservationStatus.RETURNED },
      { status: ReservationStatus.REJECTED },
    ];
    // Not all RETURNED, not all REJECTED, no IN_BOX or INUSE -> ACCEPTED
    expect(deriveLoanStatus(reservations, LoanStatus.ACCEPTED)).toBe(LoanStatus.ACCEPTED);
  });
});

describe('getLoanStatusLabel', () => {
  it('should return Finnish labels for all loan statuses', () => {
    expect(getLoanStatusLabel(LoanStatus.ACCEPTED)).toBe('Hyväksytty');
    expect(getLoanStatusLabel(LoanStatus.REJECTED)).toBe('Hylätty');
    expect(getLoanStatusLabel(LoanStatus.INUSE)).toBe('Käytössä');
    expect(getLoanStatusLabel(LoanStatus.IN_BOX)).toBe('Laatikossa');
    expect(getLoanStatusLabel(LoanStatus.PARTIALLY_RETURNED)).toBe('Osittain palautettu');
    expect(getLoanStatusLabel(LoanStatus.RETURNED)).toBe('Palautettu');
  });

  it('should return Tuntematon for unknown status', () => {
    expect(getLoanStatusLabel('UNKNOWN' as LoanStatus)).toBe('Tuntematon');
  });
});

describe('getLoanStatusColor', () => {
  it('should return correct badge variants for all statuses', () => {
    expect(getLoanStatusColor(LoanStatus.ACCEPTED)).toBe('success');
    expect(getLoanStatusColor(LoanStatus.REJECTED)).toBe('destructive');
    expect(getLoanStatusColor(LoanStatus.INUSE)).toBe('default');
    expect(getLoanStatusColor(LoanStatus.IN_BOX)).toBe('secondary');
    expect(getLoanStatusColor(LoanStatus.PARTIALLY_RETURNED)).toBe('warning');
    expect(getLoanStatusColor(LoanStatus.RETURNED)).toBe('gray');
  });
});

describe('getReservationStatusLabel', () => {
  it('should return Finnish labels for all reservation statuses', () => {
    expect(getReservationStatusLabel(ReservationStatus.ACCEPTED)).toBe('Hyväksytty');
    expect(getReservationStatusLabel(ReservationStatus.REJECTED)).toBe('Hylätty');
    expect(getReservationStatusLabel(ReservationStatus.INUSE)).toBe('Käytössä');
    expect(getReservationStatusLabel(ReservationStatus.IN_BOX)).toBe('Laatikossa');
    expect(getReservationStatusLabel(ReservationStatus.RETURNED)).toBe('Palautettu');
  });
});

describe('getReservationStatusColor', () => {
  it('should return correct badge variants for all reservation statuses', () => {
    expect(getReservationStatusColor(ReservationStatus.ACCEPTED)).toBe('success');
    expect(getReservationStatusColor(ReservationStatus.REJECTED)).toBe('destructive');
    expect(getReservationStatusColor(ReservationStatus.INUSE)).toBe('default');
    expect(getReservationStatusColor(ReservationStatus.IN_BOX)).toBe('secondary');
    expect(getReservationStatusColor(ReservationStatus.RETURNED)).toBe('gray');
  });
});
