/**
 * Integration tests for the startTime gate in updateLoan API.
 *
 * Non-admin owners may only edit a loan while now < loan.startTime.
 * These tests require a running PostgreSQL database.
 * Run: pnpm test (docker-compose is started automatically)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, Group, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function createTestUser(
  overrides: Partial<{ id: string; name: string; email: string; group: Group }> = {},
) {
  return prisma.user.create({
    data: {
      id: overrides.id || `bst-user-${Date.now()}-${Math.random()}`,
      name: overrides.name || 'Test User',
      email: overrides.email || `bst-${Date.now()}-${Math.random()}@test.com`,
      group: overrides.group || Group.USER,
    },
  });
}

async function createTestItem(
  overrides: Partial<{ id: string; name: string; amount: number }> = {},
) {
  return prisma.item.create({
    data: {
      id: overrides.id || `bst-item-${Date.now()}-${Math.random()}`,
      name: overrides.name || 'Test Item',
      amount: overrides.amount ?? 10,
    },
  });
}

async function createTestLoan(
  userId: string,
  reservations: Array<{ itemId: string; amount: number }>,
  overrides: Partial<{
    id: string;
    status: LoanStatus;
    startTime: Date;
    endTime: Date;
    description: string;
  }> = {},
) {
  const futureStart = new Date('2099-06-01T10:00:00Z');
  const futureEnd = new Date('2099-06-07T10:00:00Z');

  return prisma.loan.create({
    data: {
      id: overrides.id || `bst-loan-${Date.now()}-${Math.random()}`,
      userId,
      status: overrides.status || LoanStatus.ACCEPTED,
      startTime: overrides.startTime || futureStart,
      endTime: overrides.endTime || futureEnd,
      description: overrides.description || 'Test loan',
      reservations: { create: reservations },
    },
    include: { reservations: true, user: true },
  });
}

/**
 * Mirrors the logic of app/api/loan/updateLoan/route.ts including the startTime gate.
 */
async function updateLoanWithGate(
  loanId: string,
  reservations: Array<{ amount: number; item: { connect: { id: string } } }>,
  startTime: Date,
  endTime: Date,
  description: string,
  sessionUser: { id: string; group: Group } | null,
): Promise<{ status: number; error?: string; details?: string[]; data?: unknown }> {
  if (!sessionUser) return { status: 401, error: 'Unauthorized' };

  const existingLoan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      userId: true,
      status: true,
      startTime: true,
      reservations: { select: { status: true, itemId: true, amount: true } },
    },
  });

  if (!existingLoan) return { status: 404, error: 'Loan not found' };

  const isAdmin = sessionUser.group === Group.ADMIN;
  const isOwner = sessionUser.id === existingLoan.userId;

  if (!isAdmin && !isOwner) return { status: 403, error: 'Forbidden' };

  // Key gate: non-admin owners can only edit before startTime
  if (!isAdmin && existingLoan.startTime <= new Date()) {
    return { status: 403, error: 'Loan has already started' };
  }

  const hasInuseOrReturned = existingLoan.reservations.some(
    (r) => r.status === ReservationStatus.INUSE || r.status === ReservationStatus.RETURNED,
  );
  if (!isAdmin && hasInuseOrReturned) {
    return { status: 403, error: 'Cannot edit in this status' };
  }

  const items = await prisma.item.findMany({});
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const requestedStart = new Date(startTime);
  const requestedEnd = new Date(endTime);

  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      loan: {
        id: { not: loanId },
        startTime: { lte: requestedEnd },
        endTime: { gte: requestedStart },
      },
      status: {
        notIn: [ReservationStatus.REJECTED, ReservationStatus.RETURNED, ReservationStatus.IN_BOX],
      },
    },
    include: { loan: true },
  });

  const calculateAvailability = (itemId: string): number => {
    const item = itemMap.get(itemId);
    if (!item) return 0;
    const totalAmount = item.amount;
    let maxReserved = 0;
    const currentDate = new Date(requestedStart);
    currentDate.setHours(0, 0, 0, 0);
    const endDateNorm = new Date(requestedEnd);
    endDateNorm.setHours(23, 59, 59, 999);
    while (currentDate <= endDateNorm) {
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      const dayReserved = overlappingReservations
        .filter((r) => {
          const loanStart = new Date(r.loan.startTime);
          const loanEnd = new Date(r.loan.endTime);
          return r.itemId === itemId && loanStart <= dayEnd && loanEnd >= new Date(currentDate);
        })
        .reduce((sum, r) => sum + r.amount, 0);
      maxReserved = Math.max(maxReserved, dayReserved);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return totalAmount - maxReserved;
  };

  const requestedByItem = new Map<string, number>();
  for (const res of reservations) {
    const itemId = res.item.connect.id;
    requestedByItem.set(itemId, (requestedByItem.get(itemId) ?? 0) + res.amount);
  }

  const unavailableItems: string[] = [];
  for (const [itemId, requestedAmount] of requestedByItem.entries()) {
    const item = itemMap.get(itemId);
    if (!item) {
      unavailableItems.push(`Item not found: ${itemId}`);
      continue;
    }
    const available = calculateAvailability(itemId);
    if (requestedAmount > available) {
      unavailableItems.push(`${item.name}: requested ${requestedAmount}, available ${available}`);
    }
  }

  if (unavailableItems.length > 0) {
    return { status: 400, error: 'Availability error', details: unavailableItems };
  }

  const data = await prisma.loan.update({
    where: { id: loanId },
    data: {
      reservations: {
        deleteMany: {},
        create: reservations.map((r) => ({
          amount: r.amount,
          itemId: r.item.connect.id,
          status: ReservationStatus.ACCEPTED,
        })),
      },
      startTime,
      endTime,
      description,
    },
    include: { reservations: { include: { item: true } } },
  });

  return { status: 200, data };
}

describe('updateLoan — startTime gate', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let testItem: Awaited<ReturnType<typeof createTestItem>>;

  const PAST_START = new Date('2020-01-01T10:00:00Z');
  const PAST_END = new Date('2020-01-07T10:00:00Z');
  const FUTURE_START = new Date('2099-01-01T10:00:00Z');
  const FUTURE_END = new Date('2099-01-07T10:00:00Z');

  beforeAll(async () => {
    testUser = await createTestUser({ name: 'BST User', group: Group.USER });
    adminUser = await createTestUser({ name: 'BST Admin', group: Group.ADMIN });
    otherUser = await createTestUser({ name: 'BST Other', group: Group.USER });
    testItem = await createTestItem({ name: 'BST Teltta', amount: 5 });
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({
      where: { loan: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } } },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
    await prisma.item.deleteMany({ where: { id: testItem.id } });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reservation.deleteMany({
      where: { loan: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } } },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
  });

  it('owner cannot edit after startTime — returns 403', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 1 }],
      { startTime: PAST_START, endTime: PAST_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 2, item: { connect: { id: testItem.id } } }],
      PAST_START,
      PAST_END,
      'Trying to edit after start',
      { id: testUser.id, group: Group.USER },
    );

    expect(result.status).toBe(403);
    expect(result.error).toMatch(/started/i);
  });

  it('owner can add an item before startTime', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 1 }],
      { startTime: FUTURE_START, endTime: FUTURE_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 2, item: { connect: { id: testItem.id } } }],
      FUTURE_START,
      FUTURE_END,
      'Added more',
      { id: testUser.id, group: Group.USER },
    );

    expect(result.status).toBe(200);
    const data = result.data as { reservations: Array<{ amount: number }> };
    expect(data.reservations[0].amount).toBe(2);
  });

  it('owner can reduce item quantity before startTime', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 3 }],
      { startTime: FUTURE_START, endTime: FUTURE_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 1, item: { connect: { id: testItem.id } } }],
      FUTURE_START,
      FUTURE_END,
      'Reduced',
      { id: testUser.id, group: Group.USER },
    );

    expect(result.status).toBe(200);
    const data = result.data as { reservations: Array<{ amount: number }> };
    expect(data.reservations[0].amount).toBe(1);
  });

  it('owner can remove an item before startTime', async () => {
    const secondItem = await createTestItem({ name: 'BST Makuupussi', amount: 5 });

    try {
      const loan = await createTestLoan(
        testUser.id,
        [
          { itemId: testItem.id, amount: 1 },
          { itemId: secondItem.id, amount: 2 },
        ],
        { startTime: FUTURE_START, endTime: FUTURE_END },
      );

      const result = await updateLoanWithGate(
        loan.id,
        [{ amount: 1, item: { connect: { id: testItem.id } } }],
        FUTURE_START,
        FUTURE_END,
        'Removed one item',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
      const data = result.data as { reservations: Array<unknown> };
      expect(data.reservations).toHaveLength(1);
    } finally {
      await prisma.reservation.deleteMany({ where: { itemId: secondItem.id } });
      await prisma.item.delete({ where: { id: secondItem.id } });
    }
  });

  it('availability violation returns 400', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 1 }],
      { startTime: FUTURE_START, endTime: FUTURE_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 999, item: { connect: { id: testItem.id } } }],
      FUTURE_START,
      FUTURE_END,
      'Way too many',
      { id: testUser.id, group: Group.USER },
    );

    expect(result.status).toBe(400);
    expect(result.error).toBe('Availability error');
  });

  it('admin can edit a loan that has already started (bypass)', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 1 }],
      { startTime: PAST_START, endTime: PAST_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 2, item: { connect: { id: testItem.id } } }],
      PAST_START,
      PAST_END,
      'Admin edits past loan',
      { id: adminUser.id, group: Group.ADMIN },
    );

    expect(result.status).toBe(200);
    const data = result.data as { reservations: Array<{ amount: number }> };
    expect(data.reservations[0].amount).toBe(2);
  });

  it('non-owner gets 403 regardless of startTime', async () => {
    const loan = await createTestLoan(
      testUser.id,
      [{ itemId: testItem.id, amount: 1 }],
      { startTime: FUTURE_START, endTime: FUTURE_END },
    );

    const result = await updateLoanWithGate(
      loan.id,
      [{ amount: 2, item: { connect: { id: testItem.id } } }],
      FUTURE_START,
      FUTURE_END,
      'Unauthorized edit',
      { id: otherUser.id, group: Group.USER },
    );

    expect(result.status).toBe(403);
  });
});
