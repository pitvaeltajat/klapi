/**
 * Integration tests for `POST /api/reservation/checkInBox` — "which of these
 * kamat are sitting in the box right now?", which `useInBoxItems` asks so the
 * cart can warn that a kama has been returned but not yet checked back in.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { POST } from '@/app/api/reservation/checkInBox/route';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `checkinbox-test-${Date.now()}`;
let userId: string;
let itemIds: string[];

const ask = async (body: unknown) => {
  const response = await POST(
    new Request('http://localhost/api/reservation/checkInBox', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );
  return { status: response.status, body: await response.json() };
};

beforeAll(async () => {
  userId = (
    await prisma.user.create({
      data: { id: `${prefix}-user`, email: `${prefix}@test.com`, group: Group.USER },
    })
  ).id;
  itemIds = await Promise.all(
    ['Trangia', 'Megafoni', 'Kirves'].map(
      async (name, i) =>
        (await prisma.item.create({ data: { id: `${prefix}-item-${i}`, name, amount: 3 } })).id,
    ),
  );
  const loan = (statuses: ReservationStatus[], deletedAt?: Date) =>
    prisma.loan.create({
      data: {
        id: `${prefix}-loan-${Math.random()}`,
        userId,
        startTime: new Date('2027-05-01T09:00:00Z'),
        endTime: new Date('2027-05-02T09:00:00Z'),
        status: LoanStatus.PARTIALLY_RETURNED,
        deletedAt,
        reservations: {
          create: statuses.map((status, i) => ({ itemId: itemIds[i], amount: 1, status })),
        },
      },
    });
  // Trangia in the box twice over (two loans) — it must still be listed once.
  await loan([ReservationStatus.IN_BOX, ReservationStatus.INUSE]);
  await loan([ReservationStatus.IN_BOX]);
  // Kirves is "in the box" only on a deleted loan, which must not count.
  await loan([ReservationStatus.RETURNED, ReservationStatus.RETURNED, ReservationStatus.IN_BOX], new Date());
});

afterAll(async () => {
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe('checkInBox', () => {
  it('lists each kama in the box once, skipping deleted loans and kamat still out', async () => {
    const { status, body } = await ask({ itemIds });
    expect(status).toBe(200);
    expect(body.inBoxItems).toEqual([{ itemId: itemIds[0], itemName: 'Trangia' }]);
  });

  it('answers an empty list for kamat nobody has returned', async () => {
    const { body } = await ask({ itemIds: [itemIds[1]] });
    expect(body.inBoxItems).toEqual([]);
  });

  it('answers 400 without an itemIds array', async () => {
    expect((await ask({})).status).toBe(400);
    expect((await ask({ itemIds: 'Trangia' })).status).toBe(400);
  });
});
