/**
 * Integration tests for startLoan API logic
 *
 * Tests authorization (owner/KIOSK/ADMIN) and status transitions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `start-test-${Date.now()}`;

async function createTestUser(overrides: Partial<{ name: string; group: Group }> = {}) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-user-${Math.random()}`,
      name: overrides.name || 'Test User',
      email: `${testPrefix}-${Math.random()}@test.com`,
      group: overrides.group || Group.USER,
    },
  });
}

async function createTestItem(overrides: Partial<{ name: string; amount: number }> = {}) {
  return prisma.item.create({
    data: {
      id: `${testPrefix}-item-${Math.random()}`,
      name: overrides.name || 'Test Item',
      amount: overrides.amount ?? 10,
    },
  });
}

async function createTestLoan(
  userId: string,
  itemId: string,
  overrides: Partial<{ status: LoanStatus; reservationStatus: ReservationStatus }> = {},
) {
  return prisma.loan.create({
    data: {
      id: `${testPrefix}-loan-${Math.random()}`,
      userId,
      status: overrides.status || LoanStatus.ACCEPTED,
      startTime: new Date('2026-06-01'),
      endTime: new Date('2026-06-07'),
      description: 'Start loan test',
      reservations: {
        create: [
          {
            amount: 1,
            itemId,
            status: overrides.reservationStatus || ReservationStatus.ACCEPTED,
          },
        ],
      },
    },
    include: { reservations: true },
  });
}

/**
 * Mirrors the core logic from pages/api/loan/startLoan.ts
 */
async function startLoanDirect(
  loanId: string,
  sessionUser: { id: string; group: Group } | null,
) {
  if (!sessionUser) return { error: 'Unauthorized', status: 401 };

  if (!loanId) return { error: 'Missing loan ID', status: 400 };

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { reservations: true },
  });

  if (!loan) return { error: 'Loan not found', status: 404 };

  if (loan.status !== LoanStatus.ACCEPTED) {
    return { error: 'Can only start accepted loans', status: 400 };
  }

  const isOwner = sessionUser.id === loan.userId;
  const isKiosk = sessionUser.group === 'KIOSK';
  const isAdmin = sessionUser.group === 'ADMIN';

  if (!isOwner && !isKiosk && !isAdmin) {
    return { error: 'Forbidden', status: 403 };
  }

  const result = await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.INUSE,
      startTime: new Date(),
      reservations: {
        updateMany: {
          where: {},
          data: { status: ReservationStatus.INUSE },
        },
      },
    },
    include: { reservations: true },
  });

  return { data: result, status: 200 };
}

let testUser: Awaited<ReturnType<typeof createTestUser>>;
let adminUser: Awaited<ReturnType<typeof createTestUser>>;
let kioskUser: Awaited<ReturnType<typeof createTestUser>>;
let otherUser: Awaited<ReturnType<typeof createTestUser>>;
let testItem: Awaited<ReturnType<typeof createTestItem>>;
const userIds: string[] = [];

beforeAll(async () => {
  testUser = await createTestUser({ name: 'Start Loan Owner', group: Group.USER });
  adminUser = await createTestUser({ name: 'Start Loan Admin', group: Group.ADMIN });
  kioskUser = await createTestUser({ name: 'Start Loan Kiosk', group: Group.KIOSK });
  otherUser = await createTestUser({ name: 'Start Loan Other', group: Group.USER });
  testItem = await createTestItem({ name: 'Start Loan Item', amount: 5 });
  userIds.push(testUser.id, adminUser.id, kioskUser.id, otherUser.id);
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { loan: { userId: { in: userIds } } },
  });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.item.deleteMany({ where: { id: testItem.id } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({
    where: { loan: { userId: { in: userIds } } },
  });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
});

describe('startLoan - authorization', () => {
  it('should reject unauthenticated requests', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, null);
    expect(result.status).toBe(401);
  });

  it('should allow owner to start their own loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(200);
    expect(result.data?.status).toBe(LoanStatus.INUSE);
  });

  it('should allow ADMIN to start any loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, {
      id: adminUser.id,
      group: Group.ADMIN,
    });
    expect(result.status).toBe(200);
    expect(result.data?.status).toBe(LoanStatus.INUSE);
  });

  it('should allow KIOSK to start any loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, {
      id: kioskUser.id,
      group: Group.KIOSK,
    });
    expect(result.status).toBe(200);
    expect(result.data?.status).toBe(LoanStatus.INUSE);
  });

  it('should reject other users from starting a loan they do not own', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, {
      id: otherUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(403);
  });
});

describe('startLoan - status validation', () => {
  it('should only allow starting ACCEPTED loans', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(200);
  });

  it('should reject starting an INUSE loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id, {
      status: LoanStatus.INUSE,
      reservationStatus: ReservationStatus.INUSE,
    });
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(400);
  });

  it('should reject starting a RETURNED loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id, {
      status: LoanStatus.RETURNED,
      reservationStatus: ReservationStatus.RETURNED,
    });
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(400);
  });

  it('should reject starting a REJECTED loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id, {
      status: LoanStatus.REJECTED,
      reservationStatus: ReservationStatus.REJECTED,
    });
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(400);
  });

  it('should return 404 for nonexistent loan', async () => {
    const result = await startLoanDirect('nonexistent-loan-id', {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(404);
  });
});

describe('startLoan - state changes', () => {
  it('should update all reservation statuses to INUSE', async () => {
    // Create loan with multiple reservations
    const item2 = await createTestItem({ name: 'Start Item 2', amount: 3 });
    const loan = await prisma.loan.create({
      data: {
        id: `${testPrefix}-multi-${Math.random()}`,
        userId: testUser.id,
        status: LoanStatus.ACCEPTED,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Multi-res start test',
        reservations: {
          create: [
            { amount: 1, itemId: testItem.id, status: ReservationStatus.ACCEPTED },
            { amount: 2, itemId: item2.id, status: ReservationStatus.ACCEPTED },
          ],
        },
      },
      include: { reservations: true },
    });

    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });

    expect(result.status).toBe(200);
    expect(result.data?.reservations).toHaveLength(2);
    expect(result.data?.reservations.every((r) => r.status === ReservationStatus.INUSE)).toBe(
      true,
    );

    // Clean up extra item
    await prisma.item.delete({ where: { id: item2.id } });
  });

  it('should update startTime to current time when loan is started', async () => {
    const originalStart = new Date('2026-06-15T18:00:00Z');
    const loan = await prisma.loan.create({
      data: {
        id: `${testPrefix}-time-${Math.random()}`,
        userId: testUser.id,
        status: LoanStatus.ACCEPTED,
        startTime: originalStart,
        endTime: new Date('2026-06-20'),
        description: 'Time update test',
        reservations: {
          create: [{ amount: 1, itemId: testItem.id, status: ReservationStatus.ACCEPTED }],
        },
      },
    });

    const before = new Date();
    const result = await startLoanDirect(loan.id, {
      id: testUser.id,
      group: Group.USER,
    });
    const after = new Date();

    expect(result.status).toBe(200);

    const updated = await prisma.loan.findUnique({ where: { id: loan.id } });
    // startTime should be updated to approximately now
    expect(updated!.startTime.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(updated!.startTime.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});
