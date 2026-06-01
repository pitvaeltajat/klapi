/**
 * Integration tests for the auto-start-due-loans logic (utils/autoStartLoans).
 *
 * Verifies the clock-driven transition that moves ACCEPTED loans into INUSE once
 * their booking window has begun, including the guards that keep it from
 * touching loans it shouldn't.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { startDueLoans } from '@/utils/autoStartLoans';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `due-test-${Date.now()}`;

const DAY = 24 * 60 * 60 * 1000;

async function createTestUser() {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-user-${Math.random()}`,
      name: 'Test User',
      email: `${testPrefix}-${Math.random()}@test.com`,
      group: Group.USER,
    },
  });
}

async function createTestItem() {
  return prisma.item.create({
    data: {
      id: `${testPrefix}-item-${Math.random()}`,
      name: 'Test Item',
      amount: 10,
    },
  });
}

async function createTestLoan(
  userId: string,
  itemId: string,
  opts: {
    status?: LoanStatus;
    startTime: Date;
    reservationStatuses?: ReservationStatus[];
  },
) {
  return prisma.loan.create({
    data: {
      id: `${testPrefix}-loan-${Math.random()}`,
      userId,
      status: opts.status ?? LoanStatus.ACCEPTED,
      startTime: opts.startTime,
      endTime: new Date(opts.startTime.getTime() + 6 * DAY),
      description: 'Auto-start test',
      reservations: {
        create: (opts.reservationStatuses ?? [ReservationStatus.ACCEPTED]).map((status) => ({
          amount: 1,
          itemId,
          status,
        })),
      },
    },
    include: { reservations: true },
  });
}

async function reload(loanId: string) {
  return prisma.loan.findUniqueOrThrow({
    where: { id: loanId },
    include: { reservations: true, history: true },
  });
}

let userId: string;
let itemId: string;

beforeAll(async () => {
  const user = await createTestUser();
  const item = await createTestItem();
  userId = user.id;
  itemId = item.id;
});

afterAll(async () => {
  await prisma.loanHistory.deleteMany({ where: { loan: { userId } } });
  await prisma.reservation.deleteMany({ where: { loan: { userId } } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.item.deleteMany({ where: { id: itemId } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('startDueLoans', () => {
  it('moves an ACCEPTED loan whose start time has passed to INUSE', async () => {
    const loan = await createTestLoan(userId, itemId, {
      startTime: new Date(Date.now() - DAY),
    });

    const started = await startDueLoans(new Date(), { userIds: [userId] });
    expect(started).toContain(loan.id);

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.INUSE);
    expect(after.reservations.every((r) => r.status === ReservationStatus.INUSE)).toBe(true);
    // startTime preserved (not stamped to "now")
    expect(after.startTime.getTime()).toBe(loan.startTime.getTime());
    // logged as an automatic STARTED entry
    const started_entry = after.history.find((h) => h.action === 'STARTED');
    expect(started_entry).toBeTruthy();
    expect(started_entry?.actedById).toBeNull();
    expect((started_entry?.details as { auto?: boolean })?.auto).toBe(true);
  });

  it('leaves a loan whose start time is in the future untouched', async () => {
    const loan = await createTestLoan(userId, itemId, {
      startTime: new Date(Date.now() + DAY),
    });

    const started = await startDueLoans(new Date(), { userIds: [userId] });
    expect(started).not.toContain(loan.id);

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.ACCEPTED);
    expect(after.reservations.every((r) => r.status === ReservationStatus.ACCEPTED)).toBe(true);
  });

  it('ignores non-ACCEPTED loans (e.g. already CANCELLED)', async () => {
    const loan = await createTestLoan(userId, itemId, {
      status: LoanStatus.CANCELLED,
      startTime: new Date(Date.now() - DAY),
      reservationStatuses: [ReservationStatus.REJECTED],
    });

    await startDueLoans(new Date(), { userIds: [userId] });

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.CANCELLED);
  });

  it('only flips ACCEPTED reservations, leaving REJECTED lines alone', async () => {
    const loan = await createTestLoan(userId, itemId, {
      startTime: new Date(Date.now() - DAY),
      reservationStatuses: [ReservationStatus.ACCEPTED, ReservationStatus.REJECTED],
    });

    await startDueLoans(new Date(), { userIds: [userId] });

    const after = await reload(loan.id);
    expect(after.status).toBe(LoanStatus.INUSE);
    const statuses = after.reservations.map((r) => r.status).sort();
    expect(statuses).toEqual([ReservationStatus.INUSE, ReservationStatus.REJECTED].sort());
  });

  it('is idempotent — a second run does not re-log history', async () => {
    const loan = await createTestLoan(userId, itemId, {
      startTime: new Date(Date.now() - DAY),
    });

    await startDueLoans(new Date(), { userIds: [userId] });
    const secondRun = await startDueLoans(new Date(), { userIds: [userId] });
    expect(secondRun).not.toContain(loan.id);

    const after = await reload(loan.id);
    const startedEntries = after.history.filter((h) => h.action === 'STARTED');
    expect(startedEntries).toHaveLength(1);
  });
});
