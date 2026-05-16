/**
 * Integration tests for loanReturned API logic
 *
 * Tests authorization (owner/KIOSK/ADMIN) and the INUSE -> IN_BOX transition.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `return-test-${Date.now()}`;

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
      status: overrides.status || LoanStatus.INUSE,
      startTime: new Date('2026-06-01'),
      endTime: new Date('2026-06-07'),
      description: 'Return loan test',
      reservations: {
        create: [
          {
            amount: 1,
            itemId,
            status: overrides.reservationStatus || ReservationStatus.INUSE,
          },
        ],
      },
    },
    include: { reservations: true },
  });
}

/**
 * Mirrors the core logic from app/api/loan/loanReturned/route.ts
 */
async function returnLoanDirect(
  loanId: string,
  reservationIds: string[] | undefined,
  sessionUser: { id: string; group: Group } | null,
) {
  if (!sessionUser) return { error: 'Unauthorized', status: 401 };

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: { reservations: { select: { id: true, status: true } } },
  });

  if (!loan) return { error: 'Loan not found', status: 404 };

  const isOwner = sessionUser.id === loan.userId;
  const isKiosk = sessionUser.group === 'KIOSK';
  const isAdmin = sessionUser.group === 'ADMIN';

  if (!isOwner && !isKiosk && !isAdmin) {
    return { error: 'Forbidden', status: 401 };
  }

  const eligible = loan.reservations.filter((r) => r.status === ReservationStatus.INUSE);
  const targetIds =
    Array.isArray(reservationIds) && reservationIds.length > 0
      ? eligible.filter((r) => reservationIds.includes(r.id)).map((r) => r.id)
      : eligible.map((r) => r.id);

  if (targetIds.length === 0) {
    return { error: 'Nothing to return', status: 400 };
  }

  const box = await prisma.box.findFirst();
  if (!box) return { error: 'No box available', status: 400 };

  const result = await prisma.loan.update({
    where: { id: loanId },
    data: {
      boxId: box.id,
      reservations: {
        updateMany: {
          where: { id: { in: targetIds } },
          data: { status: ReservationStatus.IN_BOX },
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
let testBox: Awaited<ReturnType<typeof prisma.box.create>>;
const userIds: string[] = [];

beforeAll(async () => {
  testUser = await createTestUser({ name: 'Return Loan Owner', group: Group.USER });
  adminUser = await createTestUser({ name: 'Return Loan Admin', group: Group.ADMIN });
  kioskUser = await createTestUser({ name: 'Return Loan Kiosk', group: Group.KIOSK });
  otherUser = await createTestUser({ name: 'Return Loan Other', group: Group.USER });
  testItem = await createTestItem({ name: 'Return Loan Item', amount: 5 });
  testBox = await prisma.box.create({
    data: { id: `${testPrefix}-box`, name: 'Return Test Box' },
  });
  userIds.push(testUser.id, adminUser.id, kioskUser.id, otherUser.id);
});

afterAll(async () => {
  await prisma.reservation.deleteMany({
    where: { loan: { userId: { in: userIds } } },
  });
  await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.box.deleteMany({ where: { id: testBox.id } });
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

describe('loanReturned - authorization', () => {
  it('should reject unauthenticated requests', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await returnLoanDirect(loan.id, undefined, null);
    expect(result.status).toBe(401);
  });

  it('should allow owner to return their own loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await returnLoanDirect(loan.id, undefined, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(200);
    expect(result.data?.reservations.every((r) => r.status === ReservationStatus.IN_BOX)).toBe(
      true,
    );
  });

  it('should allow ADMIN to return any loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await returnLoanDirect(loan.id, undefined, {
      id: adminUser.id,
      group: Group.ADMIN,
    });
    expect(result.status).toBe(200);
  });

  it('should allow KIOSK to return any loan', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await returnLoanDirect(loan.id, undefined, {
      id: kioskUser.id,
      group: Group.KIOSK,
    });
    expect(result.status).toBe(200);
  });

  it('should reject other users from returning a loan they do not own', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id);
    const result = await returnLoanDirect(loan.id, undefined, {
      id: otherUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(401);
  });

  it('should return 404 for nonexistent loan', async () => {
    const result = await returnLoanDirect('nonexistent-loan-id', undefined, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(404);
  });
});

describe('loanReturned - return logic', () => {
  it('should reject when there is nothing in use to return', async () => {
    const loan = await createTestLoan(testUser.id, testItem.id, {
      status: LoanStatus.RETURNED,
      reservationStatus: ReservationStatus.RETURNED,
    });
    const result = await returnLoanDirect(loan.id, undefined, {
      id: testUser.id,
      group: Group.USER,
    });
    expect(result.status).toBe(400);
  });

  it('should support partial returns by reservation id', async () => {
    const item2 = await createTestItem({ name: 'Return Item 2', amount: 3 });
    const loan = await prisma.loan.create({
      data: {
        id: `${testPrefix}-partial-${Math.random()}`,
        userId: testUser.id,
        status: LoanStatus.INUSE,
        startTime: new Date('2026-06-01'),
        endTime: new Date('2026-06-07'),
        description: 'Partial return test',
        reservations: {
          create: [
            { amount: 1, itemId: testItem.id, status: ReservationStatus.INUSE },
            { amount: 2, itemId: item2.id, status: ReservationStatus.INUSE },
          ],
        },
      },
      include: { reservations: true },
    });

    const result = await returnLoanDirect(loan.id, [loan.reservations[0].id], {
      id: testUser.id,
      group: Group.USER,
    });

    expect(result.status).toBe(200);
    const inBox = result.data?.reservations.filter(
      (r) => r.status === ReservationStatus.IN_BOX,
    );
    const stillInUse = result.data?.reservations.filter(
      (r) => r.status === ReservationStatus.INUSE,
    );
    expect(inBox).toHaveLength(1);
    expect(stillInUse).toHaveLength(1);

    await prisma.item.delete({ where: { id: item2.id } });
  });
});
