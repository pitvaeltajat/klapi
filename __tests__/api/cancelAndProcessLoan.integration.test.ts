/**
 * Integration tests for `loan/cancelLoan` (the borrower withdrawing a booking)
 * and `loan/loanProcessed` (an admin checking returned kamat out of the box).
 * The real route handlers run; auth is stubbed to whichever actor the test
 * stands in for, and the calendar sync is a no-op.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `cancel-process-test-${Date.now()}`;

let actor: { id: string; group: Group };
vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: actor }, denied: null }),
  requireAdmin: async () =>
    actor.group === Group.ADMIN
      ? { session: { user: actor }, denied: null }
      : { session: null, denied: NextResponse.json({ message: 'Ei oikeutta' }, { status: 403 }) },
}));
vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));

const { POST: cancelLoan } = await import('@/app/api/loan/cancelLoan/route');
const { POST: loanProcessed } = await import('@/app/api/loan/loanProcessed/route');

const call = (handler: (r: Request) => Promise<Response>, body: Record<string, unknown>) =>
  handler(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }));

let adminId: string;
let ownerId: string;
let otherId: string;
let itemIds: string[];
let boxId: string;

async function makeLoan(status: LoanStatus, lines: ReservationStatus[], box?: string) {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId: ownerId,
      startTime: new Date('2027-04-01T09:00:00Z'),
      endTime: new Date('2027-04-03T09:00:00Z'),
      status,
      boxId: box,
      reservations: {
        create: lines.map((s, i) => ({ itemId: itemIds[i], amount: 1, status: s })),
      },
    },
    include: { reservations: true },
  });
}

const reload = (id: string) =>
  prisma.loan.findUniqueOrThrow({ where: { id }, include: { reservations: true, history: true } });

beforeAll(async () => {
  const mk = (suffix: string, group: Group) =>
    prisma.user.create({
      data: { id: `${prefix}-${suffix}`, email: `${prefix}-${suffix}@test.com`, group },
    });
  adminId = (await mk('admin', Group.ADMIN)).id;
  ownerId = (await mk('owner', Group.USER)).id;
  otherId = (await mk('other', Group.USER)).id;
  itemIds = await Promise.all(
    ['Trangia', 'Megafoni'].map(
      async (name, i) =>
        (await prisma.item.create({ data: { id: `${prefix}-item-${i}`, name, amount: 5 } })).id,
    ),
  );
  boxId = (await prisma.box.create({ data: { id: `${prefix}-box`, name: 'Laatikko' } })).id;
});

beforeEach(async () => {
  actor = { id: ownerId, group: Group.USER };
  await prisma.loan.deleteMany({ where: { userId: ownerId } });
});

afterAll(async () => {
  await prisma.loan.deleteMany({ where: { userId: ownerId } });
  await prisma.box.deleteMany({ where: { id: boxId } });
  await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [adminId, ownerId, otherId] } } });
  await prisma.$disconnect();
});

describe('cancelLoan', () => {
  it('lets the owner cancel a booking not yet picked up', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);

    expect((await call(cancelLoan, { id: loan.id })).status).toBe(200);

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.CANCELLED);
    expect(after.reservations.map((r) => r.status)).toEqual([ReservationStatus.REJECTED]);
    expect(after.history.map((h) => [h.action, h.actedById])).toEqual([['CANCELLED', ownerId]]);
  });

  it('lets an admin cancel someone else’s booking', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);
    actor = { id: adminId, group: Group.ADMIN };

    expect((await call(cancelLoan, { id: loan.id })).status).toBe(200);
    expect((await reload(loan.id)).status).toBe(LoanStatus.CANCELLED);
  });

  it('refuses another member', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);
    actor = { id: otherId, group: Group.USER };

    expect((await call(cancelLoan, { id: loan.id })).status).toBe(403);
    expect((await reload(loan.id)).status).toBe(LoanStatus.ACCEPTED);
  });

  it('refuses a loan already in use — that one must be returned', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, [ReservationStatus.INUSE]);

    expect((await call(cancelLoan, { id: loan.id })).status).toBe(400);
    expect((await reload(loan.id)).status).toBe(LoanStatus.INUSE);
  });

  it('refuses a soft-deleted loan', async () => {
    const loan = await makeLoan(LoanStatus.ACCEPTED, [ReservationStatus.ACCEPTED]);
    await prisma.loan.update({ where: { id: loan.id }, data: { deletedAt: new Date() } });

    expect((await call(cancelLoan, { id: loan.id })).status).toBe(404);
  });
});

describe('loanProcessed', () => {
  beforeEach(() => {
    actor = { id: adminId, group: Group.ADMIN };
  });

  it('marks everything in the box returned and frees the box', async () => {
    const loan = await makeLoan(
      LoanStatus.IN_BOX,
      [ReservationStatus.IN_BOX, ReservationStatus.IN_BOX],
      boxId,
    );

    expect((await call(loanProcessed, { id: loan.id })).status).toBe(200);

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.RETURNED);
    expect(after.boxId).toBeNull();
    expect(after.reservations.every((r) => r.status === ReservationStatus.RETURNED)).toBe(true);
    const entry = after.history.find((h) => h.action === 'PROCESSED_FROM_BOX');
    expect((entry?.details as { count: number }).count).toBe(2);
  });

  it('leaves kamat still with the borrower alone, and keeps the box', async () => {
    const loan = await makeLoan(
      LoanStatus.PARTIALLY_RETURNED,
      [ReservationStatus.IN_BOX, ReservationStatus.INUSE],
      boxId,
    );

    await call(loanProcessed, { id: loan.id });

    const after = await reload(loan.id);
    const byItem = Object.fromEntries(after.reservations.map((r) => [r.itemId, r.status]));
    expect(byItem).toEqual({
      [itemIds[0]]: ReservationStatus.RETURNED,
      [itemIds[1]]: ReservationStatus.INUSE,
    });
    expect(after.status).toBe(LoanStatus.PARTIALLY_RETURNED);
  });

  it('processes only the named reservations, keeping the box while some remain', async () => {
    const loan = await makeLoan(
      LoanStatus.IN_BOX,
      [ReservationStatus.IN_BOX, ReservationStatus.IN_BOX],
      boxId,
    );
    const first = loan.reservations.find((r) => r.itemId === itemIds[0])!;

    await call(loanProcessed, { id: loan.id, reservationIds: [first.id] });

    const after = await reload(loan.id);
    expect(after.boxId).toBe(boxId);
    expect(after.reservations.filter((r) => r.status === ReservationStatus.IN_BOX)).toHaveLength(1);
  });

  it('answers 400 when nothing is in the box', async () => {
    const loan = await makeLoan(LoanStatus.INUSE, [ReservationStatus.INUSE]);

    expect((await call(loanProcessed, { id: loan.id })).status).toBe(400);
  });

  it('is admin-only', async () => {
    const loan = await makeLoan(LoanStatus.IN_BOX, [ReservationStatus.IN_BOX], boxId);
    actor = { id: ownerId, group: Group.USER };

    expect((await call(loanProcessed, { id: loan.id })).status).toBe(403);
    expect((await reload(loan.id)).status).toBe(LoanStatus.IN_BOX);
  });
});
