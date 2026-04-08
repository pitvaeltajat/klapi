/**
 * Integration tests for submitLoan API logic
 *
 * Tests the core loan submission logic:
 * - Loan creation with reservations
 * - Kiosk vs regular user status handling
 * - Custom/temporary item creation
 * - IN_BOX reservation cleanup
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `submit-test-${Date.now()}`;

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

/**
 * Simulates the core submitLoan logic without session/HTTP overhead.
 * This mirrors the business logic in pages/api/loan/submitLoan.ts
 */
async function submitLoanDirect(
  sessionUser: { id: string; group: Group },
  targetUserId: string,
  reservations: Array<{ itemId: string; amount: number; name?: string }>,
  startTime: Date,
  endTime: Date,
  description: string,
  loaner?: string,
) {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true, group: true },
  });
  if (!user) return { error: 'User not found', status: 404 };

  const loanStatus = sessionUser.group === 'KIOSK' ? 'INUSE' : 'ACCEPTED';
  const reservationStatus: ReservationStatus =
    sessionUser.group === 'KIOSK' ? ReservationStatus.INUSE : ReservationStatus.ACCEPTED;

  const processedReservations: { itemId: string; amount: number }[] = [];
  for (const r of reservations) {
    let itemId = r.itemId;
    const existing = await prisma.item.findUnique({ where: { id: itemId } });
    if (!existing) {
      if (!r.name) return { error: `Missing name for custom item ${itemId}`, status: 400 };
      const created = await prisma.item.create({
        data: {
          name: r.name,
          description: 'Automaattisesti luotu väliaikainen item',
          amount: r.amount ?? 1,
          type: 'temporary',
        },
      });
      itemId = created.id;
    }
    processedReservations.push({ itemId, amount: r.amount });
  }

  // Handle IN_BOX reservations
  const itemIds = processedReservations.map((r) => r.itemId);
  const inBoxReservations = await prisma.reservation.findMany({
    where: { itemId: { in: itemIds }, status: ReservationStatus.IN_BOX },
  });
  if (inBoxReservations.length > 0) {
    await prisma.reservation.updateMany({
      where: { id: { in: inBoxReservations.map((r) => r.id) } },
      data: { status: ReservationStatus.RETURNED },
    });
  }

  const result = await prisma.loan.create({
    data: {
      reservations: {
        create: processedReservations.map((r) => ({
          amount: r.amount,
          item: { connect: { id: r.itemId } },
          status: reservationStatus,
        })),
      },
      startTime,
      endTime,
      user: { connect: { id: targetUserId } },
      description,
      loaner,
      status: loanStatus,
    },
    include: { reservations: true },
  });

  return { data: result, status: 200 };
}

let testUser: Awaited<ReturnType<typeof createTestUser>>;
let kioskUser: Awaited<ReturnType<typeof createTestUser>>;
let testItem1: Awaited<ReturnType<typeof createTestItem>>;
let testItem2: Awaited<ReturnType<typeof createTestItem>>;
const createdLoanIds: string[] = [];
const createdItemIds: string[] = [];

beforeAll(async () => {
  testUser = await createTestUser({ name: 'Submit Test User', group: Group.USER });
  kioskUser = await createTestUser({ name: 'Submit Test Kiosk', group: Group.KIOSK });
  testItem1 = await createTestItem({ name: 'Submit Teltta', amount: 5 });
  testItem2 = await createTestItem({ name: 'Submit Makuupussi', amount: 10 });
});

afterAll(async () => {
  // Clean up all created data
  await prisma.reservation.deleteMany({
    where: { loan: { userId: { in: [testUser.id, kioskUser.id] } } },
  });
  await prisma.loan.deleteMany({
    where: { id: { in: createdLoanIds } },
  });
  // Clean up temporary items
  await prisma.item.deleteMany({
    where: { id: { in: [...createdItemIds, testItem1.id, testItem2.id] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [testUser.id, kioskUser.id] } },
  });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.reservation.deleteMany({
    where: { loan: { userId: { in: [testUser.id, kioskUser.id] } } },
  });
  await prisma.loan.deleteMany({
    where: { userId: { in: [testUser.id, kioskUser.id] } },
  });
});

describe('submitLoan - basic loan creation', () => {
  it('should create a loan with ACCEPTED status for regular user', async () => {
    const result = await submitLoanDirect(
      { id: testUser.id, group: Group.USER },
      testUser.id,
      [{ itemId: testItem1.id, amount: 2 }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'Regular loan',
      'Test Loaner',
    );

    expect(result.status).toBe(200);
    expect(result.data?.status).toBe('ACCEPTED');
    expect(result.data?.reservations).toHaveLength(1);
    expect(result.data?.reservations[0].status).toBe(ReservationStatus.ACCEPTED);
    createdLoanIds.push(result.data!.id);
  });

  it('should create a loan with INUSE status for kiosk user', async () => {
    const result = await submitLoanDirect(
      { id: kioskUser.id, group: Group.KIOSK },
      testUser.id,
      [{ itemId: testItem1.id, amount: 1 }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'Kiosk loan',
    );

    expect(result.status).toBe(200);
    expect(result.data?.status).toBe('INUSE');
    expect(result.data?.reservations[0].status).toBe(ReservationStatus.INUSE);
    createdLoanIds.push(result.data!.id);
  });

  it('should create a loan with multiple reservations', async () => {
    const result = await submitLoanDirect(
      { id: testUser.id, group: Group.USER },
      testUser.id,
      [
        { itemId: testItem1.id, amount: 2 },
        { itemId: testItem2.id, amount: 3 },
      ],
      new Date('2026-07-01'),
      new Date('2026-07-07'),
      'Multi-item loan',
    );

    expect(result.status).toBe(200);
    expect(result.data?.reservations).toHaveLength(2);
    createdLoanIds.push(result.data!.id);
  });

  it('should store description and loaner', async () => {
    const result = await submitLoanDirect(
      { id: testUser.id, group: Group.USER },
      testUser.id,
      [{ itemId: testItem1.id, amount: 1 }],
      new Date('2026-08-01'),
      new Date('2026-08-07'),
      'Partioretki Nuuksioon',
      'Akela Matti',
    );

    expect(result.status).toBe(200);

    const loan = await prisma.loan.findUnique({ where: { id: result.data!.id } });
    expect(loan?.description).toBe('Partioretki Nuuksioon');
    expect(loan?.loaner).toBe('Akela Matti');
    createdLoanIds.push(result.data!.id);
  });
});

describe('submitLoan - custom/temporary items', () => {
  it('should create a temporary item when itemId does not exist', async () => {
    const result = await submitLoanDirect(
      { id: kioskUser.id, group: Group.KIOSK },
      testUser.id,
      [{ itemId: 'custom-nonexistent-12345', amount: 1, name: 'Erikoistarvike' }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'Custom item loan',
    );

    expect(result.status).toBe(200);
    createdLoanIds.push(result.data!.id);

    // Verify the temporary item was created
    const reservation = result.data!.reservations[0];
    const item = await prisma.item.findUnique({ where: { id: reservation.itemId } });
    expect(item).not.toBeNull();
    expect(item?.name).toBe('Erikoistarvike');
    expect(item?.type).toBe('temporary');
    createdItemIds.push(item!.id);
  });

  it('should return error when custom item has no name', async () => {
    const result = await submitLoanDirect(
      { id: kioskUser.id, group: Group.KIOSK },
      testUser.id,
      [{ itemId: 'custom-noname-67890', amount: 1 }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'No name item',
    );

    expect(result.status).toBe(400);
    expect(result.error).toContain('Missing name');
  });
});

describe('submitLoan - IN_BOX reservation cleanup', () => {
  it('should mark IN_BOX reservations as RETURNED when item is re-borrowed', async () => {
    // Create a loan where item is IN_BOX
    const existingLoan = await prisma.loan.create({
      data: {
        userId: testUser.id,
        status: LoanStatus.IN_BOX,
        startTime: new Date('2026-05-01'),
        endTime: new Date('2026-05-07'),
        description: 'Old loan in box',
        reservations: {
          create: [{ amount: 1, itemId: testItem1.id, status: ReservationStatus.IN_BOX }],
        },
      },
      include: { reservations: true },
    });
    createdLoanIds.push(existingLoan.id);

    const inBoxReservationId = existingLoan.reservations[0].id;

    // Submit a new loan for the same item
    const result = await submitLoanDirect(
      { id: testUser.id, group: Group.USER },
      testUser.id,
      [{ itemId: testItem1.id, amount: 1 }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'New loan taking from box',
    );

    expect(result.status).toBe(200);
    createdLoanIds.push(result.data!.id);

    // Verify the old IN_BOX reservation was marked as RETURNED
    const updatedReservation = await prisma.reservation.findUnique({
      where: { id: inBoxReservationId },
    });
    expect(updatedReservation?.status).toBe(ReservationStatus.RETURNED);
  });
});

describe('submitLoan - user validation', () => {
  it('should return 404 for nonexistent user', async () => {
    const result = await submitLoanDirect(
      { id: testUser.id, group: Group.USER },
      'nonexistent-user-id',
      [{ itemId: testItem1.id, amount: 1 }],
      new Date('2026-06-01'),
      new Date('2026-06-07'),
      'Should fail',
    );

    expect(result.status).toBe(404);
  });
});
