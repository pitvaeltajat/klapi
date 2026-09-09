import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { POST as handler } from '../../app/api/availability/getAvailabilities/route';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface AvailabilityResponse {
  availabilities: Record<
    string,
    { available: number; blockedBy?: { id: string; name: string } }
  >;
}

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

async function getAvailabilities(startDate: Date, endDate: Date): Promise<AvailabilityResponse> {
  const request = new Request('http://localhost/api/availability/getAvailabilities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      StartDate: startDate.toISOString(),
      EndDate: endDate.toISOString(),
    }),
  });
  const response = await handler(request);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${JSON.stringify(data)}`);
  }
  return data as AvailabilityResponse;
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

  // "Sininen työkalupakki" is both a kama you can borrow and a sijainti other
  // kamat live in. Lending the box lends what is inside it; lending what is
  // inside it does not lend the box.
  describe('A kama that is also a säilytyspaikka', () => {
    let box: Awaited<ReturnType<typeof createTestItem>>;
    let hammer: Awaited<ReturnType<typeof createTestItem>>;
    let boxLocationId: string;

    const start = new Date('2024-03-01T18:00:00Z');
    const end = new Date('2024-03-05T18:00:00Z');

    beforeAll(async () => {
      box = await createTestItem({ name: 'Sininen työkalupakki', amount: 1 });
      const location = await prisma.location.create({
        data: { name: box.name, itemId: box.id },
      });
      boxLocationId = location.id;
      hammer = await createTestItem({ name: 'Vasara', amount: 3 });
      await prisma.item.update({
        where: { id: hammer.id },
        data: { locationId: boxLocationId },
      });
    });

    afterAll(async () => {
      await prisma.item.updateMany({
        where: { id: hammer.id },
        data: { locationId: null },
      });
      await prisma.location.deleteMany({ where: { id: boxLocationId } });
      await prisma.item.deleteMany({ where: { id: { in: [box.id, hammer.id] } } });
    });

    it('takes its contents with it when it is loaned', async () => {
      await createTestLoan(testUser.id, [{ itemId: box.id, amount: 1 }], {
        startTime: start,
        endTime: end,
      });

      const result = await getAvailabilities(start, end);

      expect(result.availabilities[box.id].available).toBe(0);
      expect(result.availabilities[hammer.id].available).toBe(0);
      expect(result.availabilities[hammer.id].blockedBy).toEqual({
        id: box.id,
        name: box.name,
      });
    });

    it('leaves the contents alone outside the loan window', async () => {
      await createTestLoan(testUser.id, [{ itemId: box.id, amount: 1 }], {
        startTime: start,
        endTime: end,
      });

      const later = await getAvailabilities(
        new Date('2024-03-10T18:00:00Z'),
        new Date('2024-03-12T18:00:00Z'),
      );

      expect(later.availabilities[hammer.id].available).toBe(3);
      expect(later.availabilities[hammer.id].blockedBy).toBeUndefined();
    });

    it('stays loanable when something inside it is out on its own', async () => {
      await createTestLoan(testUser.id, [{ itemId: hammer.id, amount: 1 }], {
        startTime: start,
        endTime: end,
      });

      const result = await getAvailabilities(start, end);

      // The box goes out one vasara short — which is the point of being able to
      // borrow a single kama out of it.
      expect(result.availabilities[box.id].available).toBe(1);
      expect(result.availabilities[hammer.id].available).toBe(2);
    });

    it('cascades through a box inside a box', async () => {
      const trailer = await createTestItem({ name: 'Peräkärry', amount: 1 });
      const trailerLocation = await prisma.location.create({
        data: { name: trailer.name, itemId: trailer.id },
      });
      await prisma.item.update({
        where: { id: box.id },
        data: { locationId: trailerLocation.id },
      });

      try {
        await createTestLoan(testUser.id, [{ itemId: trailer.id, amount: 1 }], {
          startTime: start,
          endTime: end,
        });

        const result = await getAvailabilities(start, end);

        expect(result.availabilities[box.id].available).toBe(0);
        expect(result.availabilities[hammer.id].available).toBe(0);
        expect(result.availabilities[hammer.id].blockedBy).toEqual({
          id: trailer.id,
          name: trailer.name,
        });
      } finally {
        await prisma.item.update({ where: { id: box.id }, data: { locationId: null } });
        await prisma.location.deleteMany({ where: { id: trailerLocation.id } });
        await prisma.item.deleteMany({ where: { id: trailer.id } });
      }
    });

    it('does not hang when two boxes are stored inside each other', async () => {
      const other = await createTestItem({ name: 'Punainen työkalupakki', amount: 1 });
      const otherLocation = await prisma.location.create({
        data: { name: other.name, itemId: other.id },
      });
      // Only reachable by hand-editing, but a cycle here used to be an infinite
      // walk rather than a wrong number.
      await prisma.item.update({
        where: { id: other.id },
        data: { locationId: boxLocationId },
      });
      await prisma.item.update({
        where: { id: box.id },
        data: { locationId: otherLocation.id },
      });

      try {
        const result = await getAvailabilities(start, end);
        expect(result.availabilities[box.id].available).toBe(1);
        expect(result.availabilities[other.id].available).toBe(1);
      } finally {
        await prisma.item.update({ where: { id: box.id }, data: { locationId: null } });
        await prisma.item.update({ where: { id: other.id }, data: { locationId: null } });
        await prisma.location.deleteMany({ where: { id: otherLocation.id } });
        await prisma.item.deleteMany({ where: { id: other.id } });
      }
    });
  });
});
