/**
 * Integration tests for approveLoan and rejectLoan API logic
 *
 * Tests admin-only authorization and status transitions.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `approve-test-${Date.now()}`;

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

async function createTestItem() {
  return prisma.item.create({
    data: {
      id: `${testPrefix}-item-${Math.random()}`,
      name: 'Approve Test Item',
      amount: 5,
    },
  });
}

async function createTestLoan(userId: string, itemId: string) {
  return prisma.loan.create({
    data: {
      id: `${testPrefix}-loan-${Math.random()}`,
      userId,
      status: LoanStatus.ACCEPTED,
      startTime: new Date('2026-06-01'),
      endTime: new Date('2026-06-07'),
      description: 'Approve/reject test',
      reservations: {
        create: [{ amount: 2, itemId, status: ReservationStatus.ACCEPTED }],
      },
    },
    include: { reservations: true },
  });
}

/**
 * Mirrors approveLoan.ts logic — sets loan + reservations to INUSE
 */
async function approveLoanDirect(
  loanId: string,
  sessionUser: { group: Group } | null,
) {
  if (!sessionUser || sessionUser.group !== 'ADMIN') {
    return { error: 'Unauthorized', status: 401 };
  }

  const result = await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.INUSE,
      reservations: {
        updateMany: { where: {}, data: { status: ReservationStatus.INUSE } },
      },
    },
    include: { reservations: true },
  });

  return { data: result, status: 200 };
}

/**
 * Mirrors rejectLoan.ts logic — sets loan + reservations to REJECTED
 */
async function rejectLoanDirect(
  loanId: string,
  sessionUser: { group: Group } | null,
) {
  if (!sessionUser || sessionUser.group !== 'ADMIN') {
    return { error: 'Unauthorized', status: 401 };
  }

  const result = await prisma.loan.update({
    where: { id: loanId },
    data: {
      status: LoanStatus.REJECTED,
      reservations: {
        updateMany: { where: {}, data: { status: ReservationStatus.REJECTED } },
      },
    },
    include: { reservations: true },
  });

  return { data: result, status: 200 };
}

let testUser: Awaited<ReturnType<typeof createTestUser>>;
let adminUser: Awaited<ReturnType<typeof createTestUser>>;
let kioskUser: Awaited<ReturnType<typeof createTestUser>>;
let testItem: Awaited<ReturnType<typeof createTestItem>>;
const userIds: string[] = [];

beforeAll(async () => {
  testUser = await createTestUser({ name: 'Approve Test User', group: Group.USER });
  adminUser = await createTestUser({ name: 'Approve Test Admin', group: Group.ADMIN });
  kioskUser = await createTestUser({ name: 'Approve Test Kiosk', group: Group.KIOSK });
  testItem = await createTestItem();
  userIds.push(testUser.id, adminUser.id, kioskUser.id);
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { loan: { userId: { in: userIds } } } });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.item.deleteMany({ where: { id: testItem.id } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({ where: { loan: { userId: { in: userIds } } } });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
});

describe('approveLoan - authorization', () => {
  it('should allow ADMIN to approve a loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.status).toBe(200);
    expect(result.data?.status).toBe(LoanStatus.INUSE);
  });

  it('should reject unauthenticated approval', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, null);
    expect(result.status).toBe(401);
  });

  it('should reject regular user from approving', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, { group: Group.USER });
    expect(result.status).toBe(401);
  });

  it('should reject KIOSK user from approving', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, { group: Group.KIOSK });
    expect(result.status).toBe(401);
  });
});

describe('approveLoan - state changes', () => {
  it('should set loan status to INUSE', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.data?.status).toBe(LoanStatus.INUSE);
  });

  it('should update all reservation statuses to INUSE', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await approveLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.data?.reservations).toHaveLength(1);
    expect(result.data?.reservations[0].status).toBe(ReservationStatus.INUSE);
  });

  it('should persist the status change to the database', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    await approveLoanDirect(loan.id, { group: Group.ADMIN });

    const updated = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(updated?.status).toBe(LoanStatus.INUSE);
    expect(updated?.reservations[0].status).toBe(ReservationStatus.INUSE);
  });
});

describe('rejectLoan - authorization', () => {
  it('should allow ADMIN to reject a loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await rejectLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.status).toBe(200);
    expect(result.data?.status).toBe(LoanStatus.REJECTED);
  });

  it('should reject unauthenticated rejection', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await rejectLoanDirect(loan.id, null);
    expect(result.status).toBe(401);
  });

  it('should reject regular user from rejecting', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await rejectLoanDirect(loan.id, { group: Group.USER });
    expect(result.status).toBe(401);
  });
});

describe('rejectLoan - state changes', () => {
  it('should set loan status to REJECTED', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await rejectLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.data?.status).toBe(LoanStatus.REJECTED);
  });

  it('should update all reservation statuses to REJECTED', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await rejectLoanDirect(loan.id, { group: Group.ADMIN });

    expect(result.data?.reservations).toHaveLength(1);
    expect(result.data?.reservations[0].status).toBe(ReservationStatus.REJECTED);
  });

  it('should persist the rejection to the database', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    await rejectLoanDirect(loan.id, { group: Group.ADMIN });

    const updated = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(updated?.status).toBe(LoanStatus.REJECTED);
    expect(updated?.reservations[0].status).toBe(ReservationStatus.REJECTED);
  });
});
