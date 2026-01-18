import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/availability/getAvailabilities';

const prisma = new PrismaClient();

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
  reservations: Array<{ itemId: string; amount: number; status?: ReservationStatus }>,
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
        create: reservations.map((r) => ({
          amount: r.amount,
          itemId: r.itemId,
          status: r.status || ReservationStatus.ACCEPTED,
        })),
      },
    },
    include: {
      reservations: true,
      user: true,
    },
  });
}

async function getAvailabilities(startDate: Date, endDate: Date) {
  return new Promise<any>((resolve, reject) => {
    const req = {
      method: 'POST',
      body: {
        StartDate: startDate.toISOString(),
        EndDate: endDate.toISOString(),
      },
    } as NextApiRequest;

    let statusCode = 200;
    const res = {
      status: (code: number) => {
        statusCode = code;
        return res;
      },
      json: (data: any) => {
        if (statusCode >= 400) {
          reject(new Error(`API error ${statusCode}: ${JSON.stringify(data)}`));
        } else {
          resolve(data);
        }
      },
    } as unknown as NextApiResponse;

    handler(req, res).catch(reject);
  });
}

describe('getAvailabilities API integration tests', () => {
  let testUser: Awaited<ReturnType<typeof createTestUser>>;
  let testItem1: Awaited<ReturnType<typeof createTestItem>>;
  let testItem2: Awaited<ReturnType<typeof createTestItem>>;

  beforeAll(async () => {
    testUser = await createTestUser({ name: 'Test User', group: Group.USER });
    testItem1 = await createTestItem({ name: 'Teltta', amount: 5 });
    testItem2 = await createTestItem({ name: 'Makuupussi', amount: 10 });
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({
      where: {
        loan: { userId: testUser.id },
      },
    });
    await prisma.loan.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.item.deleteMany({
      where: { id: { in: [testItem1.id, testItem2.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reservation.deleteMany({
      where: {
        loan: { userId: testUser.id },
      },
    });
    await prisma.loan.deleteMany({
      where: { userId: testUser.id },
    });
  });

  describe('Basic availability calculation', () => {
    it('should return full availability when no reservations exist', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
      expect(result.availabilities[testItem2.id].available).toBe(10);
    });

    it('should reduce availability for ACCEPTED reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(3);
      expect(result.availabilities[testItem2.id].available).toBe(10);
    });

    it('should reduce availability for INUSE reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 3, status: ReservationStatus.INUSE }],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(2);
    });
  });

  describe('Reservation status filtering', () => {
    it('should not block availability for REJECTED reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.REJECTED }],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
    });

    it('should not block availability for RETURNED reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.RETURNED }],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
    });

    it('should not block availability for IN_BOX reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.IN_BOX }],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
    });
  });

  describe('Date range overlap', () => {
    it('should correctly calculate availability for overlapping reservations', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-03T18:00:00Z'),
          endTime: new Date('2024-02-05T18:00:00Z'),
        },
      );

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-04T18:00:00Z'),
          endTime: new Date('2024-02-06T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(1);
    });

    it('should not count reservations that end before the requested start date', async () => {
      const startDate = new Date('2024-02-05T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-01T18:00:00Z'),
          endTime: new Date('2024-02-03T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
    });

    it('should not count reservations that start after the requested end date', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-10T18:00:00Z'),
          endTime: new Date('2024-02-12T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
    });

    it('should count reservations that partially overlap with the requested range', async () => {
      const startDate = new Date('2024-02-05T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 3, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-03T18:00:00Z'),
          endTime: new Date('2024-02-07T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(2);
    });
  });

  describe('Multiple items and reservations', () => {
    it('should correctly calculate availability for multiple items independently', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-05T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [
          { itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED },
          { itemId: testItem2.id, amount: 5, status: ReservationStatus.ACCEPTED },
        ],
        {
          startTime: new Date('2024-02-02T18:00:00Z'),
          endTime: new Date('2024-02-04T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(3);
      expect(result.availabilities[testItem2.id].available).toBe(5);
    });

    it('should find minimum availability across all days in the range', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-03T18:00:00Z'),
          endTime: new Date('2024-02-05T18:00:00Z'),
        },
      );

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 3, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-06T18:00:00Z'),
          endTime: new Date('2024-02-08T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(2);
    });

    it('should return 0 when all items are reserved on some day', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 5, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-03T18:00:00Z'),
          endTime: new Date('2024-02-05T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle requests for February dates correctly', async () => {
      const startDate = new Date('2024-02-15T18:00:00Z');
      const endDate = new Date('2024-02-20T18:00:00Z');

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(5);
      expect(result.availabilities[testItem2.id].available).toBe(10);
    });

    it('should handle single day requests', async () => {
      const startDate = new Date('2024-02-15T18:00:00Z');
      const endDate = new Date('2024-02-15T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-15T10:00:00Z'),
          endTime: new Date('2024-02-15T20:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(3);
    });

    it('should handle mixed status reservations correctly', async () => {
      const startDate = new Date('2024-02-01T18:00:00Z');
      const endDate = new Date('2024-02-10T18:00:00Z');

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.ACCEPTED }],
        {
          startTime: new Date('2024-02-03T18:00:00Z'),
          endTime: new Date('2024-02-05T18:00:00Z'),
        },
      );

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 2, status: ReservationStatus.REJECTED }],
        {
          startTime: new Date('2024-02-04T18:00:00Z'),
          endTime: new Date('2024-02-06T18:00:00Z'),
        },
      );

      await createTestLoan(
        testUser.id,
        [{ itemId: testItem1.id, amount: 1, status: ReservationStatus.IN_BOX }],
        {
          startTime: new Date('2024-02-05T18:00:00Z'),
          endTime: new Date('2024-02-07T18:00:00Z'),
        },
      );

      const result = await getAvailabilities(startDate, endDate);

      expect(result.availabilities[testItem1.id].available).toBe(3);
    });
  });
});
