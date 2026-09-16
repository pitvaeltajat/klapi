/**
 * Integration tests for the admin's full-edit powers on `POST
 * /api/loan/updateLoan` — the real route handler runs; the calendar sync is
 * stubbed because it would call `after()` outside a request scope.
 *
 * What this guards: an admin may edit a loan in *every* state. Concretely —
 * 1. A loan that has already started (or been returned) skips the availability
 *    check, because a retroactive correction can't double-book anything.
 * 2. A PARTIALLY_RETURNED loan (a mix of INUSE and IN_BOX/RETURNED lines)
 *    survives the recreate-all: each reservation keeps its own status.
 * 3. An admin may reassign the loan to another member (userId) and rewrite the
 *    free-text loaner name, and the change lands in the audit trail.
 * 4. A non-admin still cannot do any of these.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `updateloan-admin-${Date.now()}`;

let adminId: string;
let userId: string;
let otherUserId: string;
let itemId: string;
let secondItemId: string;
let actor: { id: string; group: Group };

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: actor }, denied: null }),
}));

vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));

const { POST: updateLoan } = await import('@/app/api/loan/updateLoan/route');

// A start in the past: the loan has already begun, so an admin edit is a
// retroactive correction and the availability check must be skipped.
const PAST_START = new Date('2020-01-01T09:00:00Z');
const PAST_END = new Date('2020-01-05T09:00:00Z');

const edit = (body: Record<string, unknown>) =>
  updateLoan(
    new Request('http://localhost/api/loan/updateLoan', {
      method: 'POST',
      body: JSON.stringify({ startTime: PAST_START, endTime: PAST_END, description: 'Retki', ...body }),
    }),
  );

async function makeLoan(
  status: LoanStatus,
  reservationStatuses: ReservationStatus[],
  ownerId = userId,
) {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId: ownerId,
      startTime: PAST_START,
      endTime: PAST_END,
      status,
      reservations: {
        create: reservationStatuses.map((status) => ({ itemId, amount: 1, status })),
      },
    },
  });
}

/** The loan's existing reservation, as the edit form sends it back untouched. */
const keepExisting = () => ({ amount: 1, item: { connect: { id: itemId } } });

describe('updateLoan — admin full edit', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: { id: `${prefix}-user`, email: `${prefix}-user@test.com`, group: Group.USER },
    });
    userId = user.id;
    const other = await prisma.user.create({
      data: { id: `${prefix}-other`, email: `${prefix}-other@test.com`, group: Group.USER },
    });
    otherUserId = other.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Trangia', amount: 2 },
    });
    itemId = item.id;
    const secondItem = await prisma.item.create({
      data: { id: `${prefix}-item2`, name: 'Makuupussi', amount: 2 },
    });
    secondItemId = secondItem.id;
  });

  beforeEach(async () => {
    actor = { id: adminId, group: Group.ADMIN };
    await prisma.loanHistory.deleteMany({
      where: { loan: { userId: { in: [adminId, userId, otherUserId] } } },
    });
    await prisma.reservation.deleteMany({
      where: { loan: { userId: { in: [adminId, userId, otherUserId] } } },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [adminId, userId, otherUserId] } },
    });
  });

  afterAll(async () => {
    await prisma.loanHistory.deleteMany({
      where: { loan: { userId: { in: [adminId, userId, otherUserId] } } },
    });
    await prisma.reservation.deleteMany({
      where: { loan: { userId: { in: [adminId, userId, otherUserId] } } },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [adminId, userId, otherUserId] } },
    });
    await prisma.item.deleteMany({ where: { id: { in: [itemId, secondItemId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userId, otherUserId] } } });
    await prisma.$disconnect();
  });

  it('lets an admin edit a loan that has already started, bypassing availability', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, [ReservationStatus.INUSE]);

    // Someone else has booked the only two kamat for the same (past) days — a
    // retroactive correction must not be blocked by that.
    await prisma.loan.create({
      data: {
        id: `${prefix}-other-loan`,
        userId: otherUserId,
        startTime: PAST_START,
        endTime: PAST_END,
        status: LoanStatus.ACCEPTED,
        reservations: { create: [{ itemId, amount: 2, status: ReservationStatus.ACCEPTED }] },
      },
    });

    const response = await edit({
      id: loan.id,
      reservations: [{ amount: 2, item: { connect: { id: itemId } } }],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].amount).toBe(2);
  });

  it('preserves each reservation status on a PARTIALLY_RETURNED loan', async () => {
    // A realistic PARTIALLY_RETURNED loan: one kama still out (INUSE), another
    // already back in the box (IN_BOX). updateLoan keys reservations by itemId,
    // so the two lines must be different kamat.
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-partial-loan`,
        userId,
        startTime: PAST_START,
        endTime: PAST_END,
        status: LoanStatus.PARTIALLY_RETURNED,
        reservations: {
          create: [
            { itemId, amount: 1, status: ReservationStatus.INUSE },
            { itemId: secondItemId, amount: 1, status: ReservationStatus.IN_BOX },
          ],
        },
      },
    });

    const response = await edit({
      id: loan.id,
      reservations: [
        { amount: 1, item: { connect: { id: itemId } } },
        { amount: 1, item: { connect: { id: secondItemId } } },
      ],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    // Each line keeps its own status — the recreate-all must not flatten them.
    const byItem = new Map(after.reservations.map((r) => [r.itemId, r.status]));
    expect(byItem.get(itemId)).toBe(ReservationStatus.INUSE);
    expect(byItem.get(secondItemId)).toBe(ReservationStatus.IN_BOX);
  });

  it('lets an admin reassign the loan to another member and rewrite the loaner', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting()],
      userId: otherUserId,
      loaner: 'Uusi Lainaaja',
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.userId).toBe(otherUserId);
    expect(after.loaner).toBe('Uusi Lainaaja');

    const entry = await prisma.loanHistory.findFirst({
      where: { loanId: loan.id, action: 'UPDATED' },
    });
    const details = entry?.details as {
      loaner?: { userId: { from: string; to: string }; loaner: { from: string | null; to: string | null } };
    };
    expect(details.loaner).toEqual({
      userId: { from: userId, to: otherUserId },
      loaner: { from: null, to: 'Uusi Lainaaja' },
    });
  });

  it('refuses a non-admin who tries to reassign the loaner', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);
    actor = { id: userId, group: Group.USER };

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting()],
      userId: otherUserId,
      loaner: 'Uusi Lainaaja',
    });
    expect(response.status).toBe(403);

    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.userId).toBe(userId);
    expect(after.loaner).toBeNull();
  });

  it('still enforces availability for a future-dated admin edit', async () => {
    const futureStart = new Date('2099-01-01T09:00:00Z');
    const futureEnd = new Date('2099-01-05T09:00:00Z');
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-future-loan`,
        userId,
        startTime: futureStart,
        endTime: futureEnd,
        status: LoanStatus.ACCEPTED,
        reservations: { create: [{ itemId, amount: 1, status: ReservationStatus.ACCEPTED }] },
      },
    });
    // Someone else has booked both kamat for the same future days.
    await prisma.loan.create({
      data: {
        id: `${prefix}-future-other`,
        userId: otherUserId,
        startTime: futureStart,
        endTime: futureEnd,
        status: LoanStatus.ACCEPTED,
        reservations: { create: [{ itemId, amount: 2, status: ReservationStatus.ACCEPTED }] },
      },
    });

    const response = await updateLoan(
      new Request('http://localhost/api/loan/updateLoan', {
        method: 'POST',
        body: JSON.stringify({
          id: loan.id,
          startTime: futureStart,
          endTime: futureEnd,
          description: 'Retki',
          reservations: [{ amount: 2, item: { connect: { id: itemId } } }],
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it('lets an admin set each item status individually', async () => {
    // A loan with two kamat out. The admin marks one as returned to the box
    // while the other stays in use — the per-item status must win over the
    // preserved status, and the loan derives as PARTIALLY_RETURNED.
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-peritem-loan`,
        userId,
        startTime: PAST_START,
        endTime: PAST_END,
        status: LoanStatus.INUSE,
        reservations: {
          create: [
            { itemId, amount: 1, status: ReservationStatus.INUSE },
            { itemId: secondItemId, amount: 1, status: ReservationStatus.INUSE },
          ],
        },
      },
    });

    const response = await edit({
      id: loan.id,
      reservations: [
        { amount: 1, item: { connect: { id: itemId } }, status: ReservationStatus.IN_BOX },
        { amount: 1, item: { connect: { id: secondItemId } }, status: ReservationStatus.INUSE },
      ],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    const byItem = new Map(after.reservations.map((r) => [r.itemId, r.status]));
    expect(byItem.get(itemId)).toBe(ReservationStatus.IN_BOX);
    expect(byItem.get(secondItemId)).toBe(ReservationStatus.INUSE);
    // The loan derives as partially returned: one kama back, one still out.
    expect(after.status).toBe(LoanStatus.PARTIALLY_RETURNED);

    // The audit trail records the per-item status change.
    const entry = await prisma.loanHistory.findFirst({
      where: { loanId: loan.id, action: 'UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    const details = entry?.details as {
      statusChanges?: Array<{ itemId: string; from: ReservationStatus; to: ReservationStatus }>;
    };
    expect(details.statusChanges).toEqual([
      { itemId, name: 'Trangia', from: ReservationStatus.INUSE, to: ReservationStatus.IN_BOX },
    ]);
  });

  it('refuses a non-admin who tries to set a per-item status', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);
    actor = { id: userId, group: Group.USER };

    const response = await edit({
      id: loan.id,
      reservations: [
        { amount: 1, item: { connect: { id: itemId } }, status: ReservationStatus.INUSE },
      ],
    });
    expect(response.status).toBe(403);
  });
});
