/**
 * Integration test for per-content box returns through the real `loanReturned`
 * route. A box is one reservation whose "contents" are not reservations of their
 * own, so handing it back a few tools at a time is tracked in `BoxContentReturn`.
 *
 * The box stays INUSE until every content is accounted for (returned + missing),
 * at which point its reservation flips to IN_BOX. A content reported missing
 * writes a huomio and still counts as accounted, so the box can close.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `loanreturned-box-${Date.now()}`;

let adminId: string;
let boxItemId: string;
let boxLocationId: string;
let vasaraId: string;
let meisseliId: string;
let actor: { id: string; group: Group };

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: actor }, denied: null }),
}));

const { POST: loanReturned } = await import('@/app/api/loan/loanReturned/route');

const post = (body: Record<string, unknown>) =>
  loanReturned(
    new Request('http://localhost/api/loan/loanReturned', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

const makeLoan = async (id: string) =>
  prisma.loan.create({
    data: {
      id,
      userId: adminId,
      status: LoanStatus.INUSE,
      startTime: new Date('2026-06-01'),
      endTime: new Date('2026-06-07'),
      description: 'Box return',
      reservations: { create: [{ itemId: boxItemId, amount: 1, status: ReservationStatus.INUSE }] },
    },
    include: { reservations: true },
  });

describe('loanReturned — per-content box returns', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;

    // A box kama that stands behind a lainattava sijainti holding two contents.
    const boxItem = await prisma.item.create({
      data: { id: `${prefix}-box-item`, name: 'Työkalupakki', amount: 1 },
    });
    boxItemId = boxItem.id;
    const boxLocation = await prisma.location.create({
      data: { id: `${prefix}-box-loc`, name: 'Pakin sisus', itemId: boxItemId },
    });
    boxLocationId = boxLocation.id;
    const vasara = await prisma.item.create({
      data: { id: `${prefix}-vasara`, name: 'Vasara', amount: 1, locationId: boxLocationId },
    });
    vasaraId = vasara.id;
    const meisseli = await prisma.item.create({
      data: { id: `${prefix}-meisseli`, name: 'Ristipäämeisseli', amount: 3, locationId: boxLocationId },
    });
    meisseliId = meisseli.id;

    await prisma.box.create({ data: { id: `${prefix}-box`, name: 'Palautuslaatikko' } });
  });

  beforeEach(async () => {
    actor = { id: adminId, group: Group.ADMIN };
    await prisma.report.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.boxContentReturn.deleteMany({ where: { reservation: { loan: { userId: adminId } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.boxContentReturn.deleteMany({ where: { reservation: { loan: { userId: adminId } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
    await prisma.box.deleteMany({ where: { id: `${prefix}-box` } });
    await prisma.item.deleteMany({ where: { id: { in: [vasaraId, meisseliId] } } });
    await prisma.location.deleteMany({ where: { id: boxLocationId } });
    await prisma.item.deleteMany({ where: { id: boxItemId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('keeps the box INUSE while any content is still owed, and records progress', async () => {
    const loan = await makeLoan(`${prefix}-loan-partial`);
    const reservationId = loan.reservations[0].id;

    const response = await post({
      id: loan.id,
      reservationIds: [],
      boxReturns: [{ reservationId, contents: [{ itemId: vasaraId, returned: 1, missing: 0 }] }],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    // Vasara is back but the 3 meisselit are still out — box not closed.
    expect(after.reservations[0].status).toBe(ReservationStatus.INUSE);
    expect(after.boxId).toBe(`${prefix}-box`);

    const progress = await prisma.boxContentReturn.findMany({ where: { reservationId } });
    expect(progress).toHaveLength(1);
    expect(progress[0]).toMatchObject({ itemId: vasaraId, returnedAmount: 1, missingAmount: 0 });
  });

  it('accumulates across returns and flips the box to IN_BOX once all is accounted', async () => {
    const loan = await makeLoan(`${prefix}-loan-full`);
    const reservationId = loan.reservations[0].id;

    // First: hand back the vasara and 1 of 3 meisselit.
    await post({
      id: loan.id,
      reservationIds: [],
      boxReturns: [
        {
          reservationId,
          contents: [
            { itemId: vasaraId, returned: 1, missing: 0 },
            { itemId: meisseliId, returned: 1, missing: 0 },
          ],
        },
      ],
    });

    let after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].status).toBe(ReservationStatus.INUSE);

    // Then: the last 2 meisselit — one returned, one missing. Now every content
    // is accounted for, so the box closes.
    const response = await post({
      id: loan.id,
      reservationIds: [],
      boxReturns: [
        { reservationId, contents: [{ itemId: meisseliId, returned: 1, missing: 1 }] },
      ],
      reportContent: 'Puuttuu laatikosta "Työkalupakki": Ristipäämeisseli (1 kpl)',
    });
    expect(response.status).toBe(200);

    after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].status).toBe(ReservationStatus.IN_BOX);
    expect(after.status).toBe(LoanStatus.IN_BOX);

    const meisseliProgress = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    // 1 (first return) + 1 returned + 1 missing = 3, the whole amount.
    expect(meisseliProgress).toMatchObject({ returnedAmount: 2, missingAmount: 1 });

    const reports = await prisma.report.findMany({ where: { loanId: loan.id } });
    expect(reports).toHaveLength(1);
    expect(reports[0].content).toContain('Puuttuu laatikosta');
  });

  it('clamps a content return to what is still owed', async () => {
    const loan = await makeLoan(`${prefix}-loan-clamp`);
    const reservationId = loan.reservations[0].id;

    // Ask to return 9 meisselit when only 3 exist — must clamp to 3.
    await post({
      id: loan.id,
      reservationIds: [],
      boxReturns: [
        {
          reservationId,
          contents: [
            { itemId: vasaraId, returned: 5, missing: 0 },
            { itemId: meisseliId, returned: 9, missing: 0 },
          ],
        },
      ],
    });

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    expect(meisseli.returnedAmount).toBe(3);

    // Everything clamped to full → box closes in one go.
    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].status).toBe(ReservationStatus.IN_BOX);
  });
});
