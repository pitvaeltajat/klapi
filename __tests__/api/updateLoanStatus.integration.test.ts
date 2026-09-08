/**
 * Integration tests for the admin's manual loan status — `POST
 * /api/loan/updateLoan` with a `status` field. The real route handler runs; the
 * calendar sync is stubbed because it would call `after()` outside a request
 * scope.
 *
 * The point of the field is putting a loan *back*: käytössä → hyväksytty when
 * the kamat never actually left. What has to hold is that it stays a privileged
 * edit, that it flattens onto the reservations (or the loan page would derive a
 * different status than the admin picked), and that it does not become a way
 * around the availability/overlap check.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `updateloan-status-test-${Date.now()}`;

let adminId: string;
let userId: string;
let itemId: string;
let actor: { id: string; group: Group };

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: actor }, denied: null }),
}));

vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));

const { POST: updateLoan } = await import('@/app/api/loan/updateLoan/route');

const start = new Date('2027-03-01T09:00:00Z');
const end = new Date('2027-03-05T09:00:00Z');

const edit = (body: Record<string, unknown>) =>
  updateLoan(
    new Request('http://localhost/api/loan/updateLoan', {
      method: 'POST',
      body: JSON.stringify({ startTime: start, endTime: end, description: 'Retki', ...body }),
    }),
  );

async function makeLoan(status: LoanStatus, reservationStatus: ReservationStatus, boxId?: string) {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId,
      startTime: start,
      endTime: end,
      status,
      boxId,
      reservations: { create: [{ itemId, amount: 1, status: reservationStatus }] },
    },
  });
}

/** The loan's existing reservation, as the edit form sends it back untouched. */
const keepExisting = () => ({ amount: 1, item: { connect: { id: itemId } } });

describe('updateLoan — manual status', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const user = await prisma.user.create({
      data: { id: `${prefix}-user`, email: `${prefix}-user@test.com`, group: Group.USER },
    });
    userId = user.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Trangia', amount: 2 },
    });
    itemId = item.id;
  });

  beforeEach(async () => {
    actor = { id: adminId, group: Group.ADMIN };
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: { in: [adminId, userId] } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: { in: [adminId, userId] } } } });
    await prisma.loan.deleteMany({ where: { userId: { in: [adminId, userId] } } });
  });

  afterAll(async () => {
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: { in: [adminId, userId] } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: { in: [adminId, userId] } } } });
    await prisma.loan.deleteMany({ where: { userId: { in: [adminId, userId] } } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.user.deleteMany({ where: { id: { in: [adminId, userId] } } });
    await prisma.$disconnect();
  });

  it('brings an in-use loan back to accepted, reservations and all', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, ReservationStatus.INUSE);

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting()],
      status: LoanStatus.ACCEPTED,
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.ACCEPTED);
    expect(after.reservations.map((r) => r.status)).toEqual([ReservationStatus.ACCEPTED]);
  });

  it('frees the box when the loan leaves it', async () => {
    const box = await prisma.box.create({ data: { id: `${prefix}-box`, name: 'Laatikko 1' } });
    const loan = await makeLoan(LoanStatus.IN_BOX, ReservationStatus.IN_BOX, box.id);

    await edit({ id: loan.id, reservations: [keepExisting()], status: LoanStatus.INUSE });

    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.boxId).toBeNull();
    await prisma.box.delete({ where: { id: box.id } });
  });

  it('records the change in the loan history', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, ReservationStatus.INUSE);

    await edit({ id: loan.id, reservations: [keepExisting()], status: LoanStatus.ACCEPTED });

    const entry = await prisma.loanHistory.findFirst({
      where: { loanId: loan.id, action: 'UPDATED' },
    });
    const details = entry?.details as { status?: { from: string; to: string } };
    expect(details.status).toEqual({ from: LoanStatus.INUSE, to: LoanStatus.ACCEPTED });
  });

  it('leaves the status alone when the edit does not name one', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, ReservationStatus.INUSE);

    await edit({ id: loan.id, reservations: [keepExisting()] });

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.status).toBe(LoanStatus.INUSE);
    expect(after.reservations.map((r) => r.status)).toEqual([ReservationStatus.INUSE]);
  });

  it('refuses the derived PARTIALLY_RETURNED, and anything not a status', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, ReservationStatus.INUSE);

    for (const status of [LoanStatus.PARTIALLY_RETURNED, 'HYVÄKSYTTY']) {
      const response = await edit({ id: loan.id, reservations: [keepExisting()], status });
      expect(response.status).toBe(400);
    }
    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.status).toBe(LoanStatus.INUSE);
  });

  it('refuses a non-admin, even the loan owner', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, ReservationStatus.ACCEPTED);
    actor = { id: userId, group: Group.USER };

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting()],
      status: LoanStatus.RETURNED,
    });
    expect(response.status).toBe(403);

    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.status).toBe(LoanStatus.ACCEPTED);
  });

  it('still checks availability — a status is not a way past an overlap', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, ReservationStatus.INUSE);
    // Someone else has booked both of them for the same days.
    const other = await prisma.loan.create({
      data: {
        id: `${prefix}-other`,
        userId: adminId,
        startTime: start,
        endTime: end,
        status: LoanStatus.ACCEPTED,
        reservations: { create: [{ itemId, amount: 2, status: ReservationStatus.ACCEPTED }] },
      },
    });

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting()],
      status: LoanStatus.ACCEPTED,
    });
    expect(response.status).toBe(400);

    const after = await prisma.loan.findUniqueOrThrow({ where: { id: loan.id } });
    expect(after.status).toBe(LoanStatus.INUSE);
    expect(other.id).toBeTruthy();
  });
});
