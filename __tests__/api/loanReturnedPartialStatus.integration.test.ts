/**
 * Integration test for the admin's partial return producing PARTIALLY_RETURNED.
 *
 * The real `loanReturned` route runs. When an admin returns only some of a
 * loan's INUSE reservations, the loan must derive to PARTIALLY_RETURNED (a mix
 * of INUSE + IN_BOX), not stay INUSE.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `loanreturned-partial-${Date.now()}`;

let adminId: string;
let itemId: string;
let secondItemId: string;
let actor: { id: string; group: Group };

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: actor }, denied: null }),
}));

const { POST: loanReturned } = await import('@/app/api/loan/loanReturned/route');

const post = (body: Record<string, unknown>) =>
  loanReturned(
    new Request('http://localhost/api/loan/loanReturned', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

describe('loanReturned — partial return status', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Trangia', amount: 2 },
    });
    itemId = item.id;
    const secondItem = await prisma.item.create({
      data: { id: `${prefix}-item2`, name: 'Makuupussi', amount: 2 },
    });
    secondItemId = secondItem.id;
    await prisma.box.create({ data: { id: `${prefix}-box`, name: 'Laatikko 1' } });
  });

  beforeEach(async () => {
    actor = { id: adminId, group: Group.ADMIN };
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
  });

  afterAll(async () => {
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
    await prisma.box.deleteMany({ where: { id: `${prefix}-box` } });
    await prisma.item.deleteMany({ where: { id: { in: [itemId, secondItemId] } } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('derives PARTIALLY_RETURNED when an admin returns only some of the items', async () => {
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-loan`,
        userId: adminId,
        status: LoanStatus.INUSE,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Partial return',
        reservations: {
          create: [
            { itemId, amount: 1, status: ReservationStatus.INUSE },
            { itemId: secondItemId, amount: 1, status: ReservationStatus.INUSE },
          ],
        },
      },
      include: { reservations: true },
    });

    // Return only the first item.
    const response = await post({
      id: loan.id,
      reservationIds: [loan.reservations[0].id],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.PARTIALLY_RETURNED);
    const byItem = new Map(after.reservations.map((r) => [r.itemId, r.status]));
    expect(byItem.get(itemId)).toBe(ReservationStatus.IN_BOX);
    expect(byItem.get(secondItemId)).toBe(ReservationStatus.INUSE);
  });

  it('derives PARTIALLY_RETURNED for a loan with ACCEPTED reservations that is partially returned', async () => {
    // A "stuck" loan: picked up without ever being marked INUSE, so its
    // reservations are still ACCEPTED. Returning some of them must still read
    // as PARTIALLY_RETURNED (some out, some back), not plain IN_BOX.
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-accepted-loan`,
        userId: adminId,
        status: LoanStatus.ACCEPTED,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Accepted partial return',
        reservations: {
          create: [
            { itemId, amount: 1, status: ReservationStatus.ACCEPTED },
            { itemId: secondItemId, amount: 1, status: ReservationStatus.ACCEPTED },
          ],
        },
      },
      include: { reservations: true },
    });

    const response = await post({
      id: loan.id,
      reservationIds: [loan.reservations[0].id],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.PARTIALLY_RETURNED);
    const byItem = new Map(after.reservations.map((r) => [r.itemId, r.status]));
    expect(byItem.get(itemId)).toBe(ReservationStatus.IN_BOX);
    expect(byItem.get(secondItemId)).toBe(ReservationStatus.ACCEPTED);
  });

  it('splits a multi-instance reservation when only part of it is returned', async () => {
    // A loan of 3 identical kamat (one reservation, amount 3). Returning 2 of
    // them must split the reservation: a new IN_BOX line of 2 is minted while
    // the original line keeps 1 and stays out.
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-split-loan`,
        userId: adminId,
        status: LoanStatus.INUSE,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Split return',
        reservations: {
          create: [{ itemId, amount: 3, status: ReservationStatus.INUSE }],
        },
      },
      include: { reservations: true },
    });

    const response = await post({
      id: loan.id,
      returns: [{ reservationId: loan.reservations[0].id, amount: 2 }],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.PARTIALLY_RETURNED);

    // Two lines of the same item now: one IN_BOX of 2, one INUSE of 1.
    const lines = after.reservations.filter((r) => r.itemId === itemId);
    expect(lines).toHaveLength(2);
    const inBox = lines.find((r) => r.status === ReservationStatus.IN_BOX);
    const stillOut = lines.find((r) => r.status === ReservationStatus.INUSE);
    expect(inBox?.amount).toBe(2);
    expect(stillOut?.amount).toBe(1);
  });

  it('returns a multi-instance reservation in full when the amount matches', async () => {
    // Returning the whole amount must not split — the single reservation just
    // flips to IN_BOX.
    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-full-loan`,
        userId: adminId,
        status: LoanStatus.INUSE,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Full return',
        reservations: {
          create: [{ itemId, amount: 3, status: ReservationStatus.INUSE }],
        },
      },
      include: { reservations: true },
    });

    const response = await post({
      id: loan.id,
      returns: [{ reservationId: loan.reservations[0].id, amount: 3 }],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.IN_BOX);
    const lines = after.reservations.filter((r) => r.itemId === itemId);
    expect(lines).toHaveLength(1);
    expect(lines[0].status).toBe(ReservationStatus.IN_BOX);
    expect(lines[0].amount).toBe(3);
  });
});
