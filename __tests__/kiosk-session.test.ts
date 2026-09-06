/**
 * Unit tests for `utils/kioskSession.ts` — the "is this the kaluston kone?"
 * predicate the loan flow branches on, client and server alike.
 */

import { describe, it, expect } from 'vitest';
import { isKioskMachine, loanStartsNow } from '@/utils/kioskSession';

describe('isKioskMachine', () => {
  it('is the kiosk login itself', () => {
    expect(isKioskMachine({ group: 'KIOSK' })).toBe(true);
  });

  it('is an admin PIN-elevated on top of the kiosk', () => {
    // Elevation flips the group to ADMIN and leaves `elevatedById` behind as the
    // only trace that this is still the shared terminal.
    expect(isKioskMachine({ group: 'ADMIN', elevatedById: 'admin-1' })).toBe(true);
  });

  it('is not an admin signed in on their own machine', () => {
    expect(isKioskMachine({ group: 'ADMIN' })).toBe(false);
    expect(isKioskMachine({ group: 'ADMIN', elevatedById: null })).toBe(false);
  });

  it('is not an ordinary member, elevated-looking claims and all', () => {
    // A USER can never elevate (`lib/auth.ts` refuses a non-kiosk base), so a
    // token claiming both is a forgery and reads as an ordinary member here.
    expect(isKioskMachine({ group: 'USER' })).toBe(false);
    expect(isKioskMachine({ group: 'USER', elevatedById: 'admin-1' })).toBe(false);
  });

  it('is not a signed-out visitor', () => {
    expect(isKioskMachine(null)).toBe(false);
    expect(isKioskMachine(undefined)).toBe(false);
    expect(isKioskMachine({})).toBe(false);
  });
});

describe('loanStartsNow', () => {
  const now = new Date('2026-09-07T12:00:00Z');

  it('accepts a loan starting this moment', () => {
    expect(loanStartsNow(now, now)).toBe(true);
  });

  it('accepts one already under way', () => {
    expect(loanStartsNow(new Date('2026-09-07T11:40:00Z'), now)).toBe(true);
  });

  it('tolerates a browser clock running slightly fast', () => {
    expect(loanStartsNow(new Date('2026-09-07T12:00:30Z'), now)).toBe(true);
  });

  it('rejects a booking for later — that is a reservation, not a pickup', () => {
    expect(loanStartsNow(new Date('2026-09-07T14:00:00Z'), now)).toBe(false);
    expect(loanStartsNow(new Date('2026-09-20T09:00:00Z'), now)).toBe(false);
  });

  it('rejects a start time it cannot read', () => {
    expect(loanStartsNow('eilen', now)).toBe(false);
  });
});
