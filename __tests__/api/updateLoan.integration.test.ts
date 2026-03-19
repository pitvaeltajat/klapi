/**
 * Integration tests for updateLoan API
 *
 * These tests require a running PostgreSQL database.
 * Run: pnpm test (docker-compose is started automatically)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Helper to create test data
async function createTestUser(
  overrides: Partial<{
    id: string;
    name: string;
    email: string;
    group: Group;
  }> = {},
) {
  return prisma.user.create({
    data: {
      id: overrides.id || `test-user-${Date.now()}-${Math.random()}`,
      name: overrides.name || 'Test User',
      email: overrides.email || `test-${Date.now()}-${Math.random()}@test.com`,
      group: overrides.group || Group.USER,
    },
  });
}

async function createTestItem(
  overrides: Partial<{
    id: string;
    name: string;
    amount: number;
  }> = {},
) {
  return prisma.item.create({
    data: {
      id: overrides.id || `test-item-${Date.now()}-${Math.random()}`,
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
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.loan.create({
    data: {
      id: overrides.id || `test-loan-${Date.now()}-${Math.random()}`,
      userId,
      status: overrides.status || LoanStatus.ACCEPTED,
      startTime: overrides.startTime || now,
      endTime: overrides.endTime || tomorrow,
      description: overrides.description || 'Test loan',
      reservations: {
        create: reservations,
      },
    },
    include: {
      reservations: true,
      user: true,
    },
  });
}

// Helper to simulate API call (testing the logic directly)
async function updateLoanDirect(
  loanId: string,
  reservations: Array<{ amount: number; item: { connect: { id: string } } }>,
  startTime: Date,
  endTime: Date,
  description: string,
  sessionUser: { id: string; group: Group } | null,
) {
  if (!sessionUser) {
    return { error: 'Unauthorized', status: 401 };
  }

  const existingLoan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { userId: true, status: true },
  });

  if (!existingLoan) {
    return { error: 'Loan not found', status: 404 };
  }

  const isAdmin = sessionUser.group === 'ADMIN';
  const isOwner = sessionUser.id === existingLoan.userId;

  if (!isAdmin && !isOwner) {
    return { error: 'Forbidden', status: 403 };
  }

  const statusAllowsEdit =
    existingLoan.status !== 'INUSE' && existingLoan.status !== 'RETURNED';
  if (!isAdmin && !statusAllowsEdit) {
    return { error: 'Cannot edit in this status', status: 403 };
  }

  // Validate availability
  const items = await prisma.item.findMany({});
  const itemMap = new Map(items.map((item) => [item.id, item]));

  const requestedStart = new Date(startTime);
  const requestedEnd = new Date(endTime);

  const overlappingReservations = await prisma.reservation.findMany({
    where: {
      loan: {
        id: { not: loanId },
        status: { notIn: ['REJECTED', 'RETURNED'] },
        startTime: { lte: requestedEnd },
        endTime: { gte: requestedStart },
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
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayReserved = overlappingReservations
        .filter((r) => {
          const loanStart = new Date(r.loan.startTime);
          const loanEnd = new Date(r.loan.endTime);
          return r.itemId === itemId && loanStart <= dayEnd && loanEnd >= dayStart;
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
    const current = requestedByItem.get(itemId) ?? 0;
    requestedByItem.set(itemId, current + res.amount);
  }

  const unavailableItems: string[] = [];
  for (const [itemId, requestedAmount] of Array.from(requestedByItem.entries())) {
    const item = itemMap.get(itemId);
    if (!item) {
      unavailableItems.push(`Item not found: ${itemId}`);
      continue;
    }

    const available = calculateAvailability(itemId);

    if (requestedAmount > available) {
      unavailableItems.push(
        `${item.name}: requested ${requestedAmount}, available ${available}`,
      );
    }
  }

  if (unavailableItems.length > 0) {
    return { error: 'Availability error', details: unavailableItems, status: 400 };
  }

  const result = await prisma.loan.update({
    where: { id: loanId },
    data: {
      reservations: {
        deleteMany: {},
        create: reservations.map((r) => ({
          amount: r.amount,
          itemId: r.item.connect.id,
        })),
      },
      startTime,
      endTime,
      description,
    },
    include: {
      reservations: {
        include: { item: true },
      },
    },
  });

  return { data: result, status: 200 };
}

describe('updateLoan API integration tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let adminUser: Awaited<ReturnType<typeof createTestUser>>;
  let otherUser: Awaited<ReturnType<typeof createTestUser>>;
  let testItem1: Awaited<ReturnType<typeof createTestItem>>;
  let testItem2: Awaited<ReturnType<typeof createTestItem>>;

  beforeAll(async () => {
    testUser = await createTestUser({ name: 'Test User', group: Group.USER });
    adminUser = await createTestUser({ name: 'Admin User', group: Group.ADMIN });
    otherUser = await createTestUser({ name: 'Other User', group: Group.USER });
    testItem1 = await createTestItem({ name: 'Teltta', amount: 5 });
    testItem2 = await createTestItem({ name: 'Makuupussi', amount: 10 });
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({
      where: {
        loan: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
      },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
    await prisma.item.deleteMany({
      where: { id: { in: [testItem1.id, testItem2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reservation.deleteMany({
      where: {
        loan: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
      },
    });
    await prisma.loan.deleteMany({
      where: { userId: { in: [testUser.id, adminUser.id, otherUser.id] } },
    });
  });

  describe('Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 2, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Updated',
        null,
      );

      expect(result.status).toBe(401);
    });

    it('should allow user to edit their own loan', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 2, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Updated by owner',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
      expect(result.data?.description).toBe('Updated by owner');
    });

    it('should prevent user from editing another users loan', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 2, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Trying to edit',
        { id: otherUser.id, group: Group.USER },
      );

      expect(result.status).toBe(403);
    });

    it('should allow admin to edit any loan', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 3, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Updated by admin',
        { id: adminUser.id, group: Group.ADMIN },
      );

      expect(result.status).toBe(200);
      expect(result.data?.description).toBe('Updated by admin');
    });

    it('should prevent non-admin from editing INUSE loans', async () => {
      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { status: LoanStatus.INUSE },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 2, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Trying to edit',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(403);
    });

    it('should prevent non-admin from editing RETURNED loans', async () => {
      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { status: LoanStatus.RETURNED },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 2, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Trying to edit',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(403);
    });
  });

  describe('Availability validation', () => {
    it('should allow editing within available quantity', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 2 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 4, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Increased amount',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
      expect(result.data?.reservations[0].amount).toBe(4);
    });

    it('should reject editing beyond available quantity', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 2 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 10, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Too many',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(400);
      expect(result.error).toBe('Availability error');
    });

    it('should consider other overlapping loans when calculating availability', async () => {
      const startTime = new Date('2025-06-01');
      const endTime = new Date('2025-06-07');

      await createTestLoan(
        otherUser.id,
        [{ itemId: testItem1.id, amount: 3 }],
        { startTime, endTime },
      );

      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { startTime, endTime },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 3, item: { connect: { id: testItem1.id } } }],
        startTime,
        endTime,
        'Too many with overlap',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(400);
      expect(result.error).toBe('Availability error');
    });

    it('should allow full availability when other loan does not overlap', async () => {
      await createTestLoan(
        otherUser.id,
        [{ itemId: testItem1.id, amount: 4 }],
        { startTime: new Date('2025-07-01'), endTime: new Date('2025-07-07') },
      );

      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { startTime: new Date('2025-06-01'), endTime: new Date('2025-06-07') },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 5, item: { connect: { id: testItem1.id } } }],
        new Date('2025-06-01'),
        new Date('2025-06-07'),
        'Full availability',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
      expect(result.data?.reservations[0].amount).toBe(5);
    });

    it('should ignore REJECTED loans when calculating availability', async () => {
      const startTime = new Date('2025-06-01');
      const endTime = new Date('2025-06-07');

      await createTestLoan(
        otherUser.id,
        [{ itemId: testItem1.id, amount: 5 }],
        { startTime, endTime, status: LoanStatus.REJECTED },
      );

      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { startTime, endTime },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 5, item: { connect: { id: testItem1.id } } }],
        startTime,
        endTime,
        'Full availability despite rejected',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
    });

    it('should ignore RETURNED loans when calculating availability', async () => {
      const startTime = new Date('2025-06-01');
      const endTime = new Date('2025-06-07');

      await createTestLoan(
        otherUser.id,
        [{ itemId: testItem1.id, amount: 5 }],
        { startTime, endTime, status: LoanStatus.RETURNED },
      );

      const loan = await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1 }],
        { startTime, endTime },
      );

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 5, item: { connect: { id: testItem1.id } } }],
        startTime,
        endTime,
        'Full availability despite returned',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);
    });
  });

  describe('Data persistence', () => {
    it('should correctly update reservations in database', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
        { itemId: testItem2.id, amount: 2 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [
          { amount: 3, item: { connect: { id: testItem1.id } } },
          { amount: 5, item: { connect: { id: testItem2.id } } },
        ],
        loan.startTime,
        loan.endTime,
        'Updated amounts',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);

      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: { reservations: true },
      });

      expect(updatedLoan?.reservations).toHaveLength(2);

      const item1Reservation = updatedLoan?.reservations.find(
        (r) => r.itemId === testItem1.id,
      );
      const item2Reservation = updatedLoan?.reservations.find(
        (r) => r.itemId === testItem2.id,
      );

      expect(item1Reservation?.amount).toBe(3);
      expect(item2Reservation?.amount).toBe(5);
    });

    it('should remove items when not included in update', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
        { itemId: testItem2.id, amount: 2 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 3, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'Removed one item',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);

      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
        include: { reservations: true },
      });

      expect(updatedLoan?.reservations).toHaveLength(1);
      expect(updatedLoan?.reservations[0].itemId).toBe(testItem1.id);
    });

    it('should update loan dates correctly', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const newStart = new Date('2025-08-01');
      const newEnd = new Date('2025-08-15');

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 1, item: { connect: { id: testItem1.id } } }],
        newStart,
        newEnd,
        'Updated dates',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);

      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
      });

      expect(updatedLoan?.startTime.toISOString()).toBe(newStart.toISOString());
      expect(updatedLoan?.endTime.toISOString()).toBe(newEnd.toISOString());
    });

    it('should update description correctly', async () => {
      const loan = await createTestLoan(testUser.id, [
        { itemId: testItem1.id, amount: 1 },
      ]);

      const result = await updateLoanDirect(
        loan.id,
        [{ amount: 1, item: { connect: { id: testItem1.id } } }],
        loan.startTime,
        loan.endTime,
        'New description text',
        { id: testUser.id, group: Group.USER },
      );

      expect(result.status).toBe(200);

      const updatedLoan = await prisma.loan.findUnique({
        where: { id: loan.id },
      });

      expect(updatedLoan?.description).toBe('New description text');
    });
  });
});
