/**
 * Integration test for the admin's per-content shelving check through the real
 * `loanProcessed` route. When a returned box is shelved, the admin can flag
 * units that are not actually in it; those move from returnedAmount to
 * missingAmount on `BoxContentReturn` and are logged as a huomio, while the box
 * reservation flips IN_BOX → RETURNED either way.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `loanprocessed-box-${Date.now()}`;

let adminId: string;
let boxItemId: string;
let boxLocationId: string;
let vasaraId: string;
let meisseliId: string;
let actor: { id: string; group: Group };

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () => ({ session: { user: actor }, denied: null }),
}));

const { POST: loanProcessed } = await import('@/app/api/loan/loanProcessed/route');

const post = (body: Record<string, unknown>) =>
  loanProcessed(
    new Request('http://localhost/api/loan/loanProcessed', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

/** A returned box loan (IN_BOX) with the borrower's content returns pre-recorded. */
const makeInBoxLoan = async (
  id: string,
  returns: Array<{ itemId: string; returnedAmount: number; missingAmount: number }>,
) => {
  const loan = await prisma.loan.create({
    data: {
      id,
      userId: adminId,
      status: LoanStatus.IN_BOX,
      boxId: `${prefix}-box`,
      startTime: new Date('2026-06-01'),
      endTime: new Date('2026-06-07'),
      description: 'Box shelving',
      reservations: { create: [{ itemId: boxItemId, amount: 1, status: ReservationStatus.IN_BOX }] },
    },
    include: { reservations: true },
  });
  const reservationId = loan.reservations[0].id;
  if (returns.length > 0) {
    await prisma.boxContentReturn.createMany({
      data: returns.map((r) => ({ reservationId, ...r })),
    });
  }
  return { loan, reservationId };
};

describe('loanProcessed — admin shelving verification', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;

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

  it('shelves the box and leaves the content returns untouched when nothing is flagged', async () => {
    const { loan, reservationId } = await makeInBoxLoan(`${prefix}-plain`, [
      { itemId: vasaraId, returnedAmount: 1, missingAmount: 0 },
      { itemId: meisseliId, returnedAmount: 3, missingAmount: 0 },
    ]);

    const response = await post({ id: loan.id, reservationIds: [reservationId] });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].status).toBe(ReservationStatus.RETURNED);
    expect(after.status).toBe(LoanStatus.RETURNED);
    expect(after.boxId).toBeNull();

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    expect(meisseli).toMatchObject({ returnedAmount: 3, missingAmount: 0 });
    expect(await prisma.report.findMany({ where: { loanId: loan.id } })).toHaveLength(0);
  });

  it('moves units to missing and logs a huomio when the admin finds fewer', async () => {
    const { loan, reservationId } = await makeInBoxLoan(`${prefix}-flag`, [
      { itemId: vasaraId, returnedAmount: 1, missingAmount: 0 },
      { itemId: meisseliId, returnedAmount: 3, missingAmount: 0 },
    ]);

    const response = await post({
      id: loan.id,
      reservationIds: [reservationId],
      boxVerifications: [{ reservationId, contents: [{ itemId: meisseliId, missing: 1 }] }],
    });
    expect(response.status).toBe(200);

    const after = await prisma.loan.findUniqueOrThrow({
      where: { id: loan.id },
      include: { reservations: true },
    });
    expect(after.reservations[0].status).toBe(ReservationStatus.RETURNED);

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    expect(meisseli).toMatchObject({ returnedAmount: 2, missingAmount: 1 });

    const reports = await prisma.report.findMany({ where: { loanId: loan.id } });
    expect(reports).toHaveLength(1);
    expect(reports[0].content).toContain('Puuttui tarkistuksessa laatikosta');
    expect(reports[0].content).toContain('Ristipäämeisseli (1 kpl)');
  });

  it('marks units found, moving missing back to returned and logging it', async () => {
    const { loan, reservationId } = await makeInBoxLoan(`${prefix}-found`, [
      { itemId: meisseliId, returnedAmount: 0, missingAmount: 3 },
    ]);

    const response = await post({
      id: loan.id,
      reservationIds: [reservationId],
      boxVerifications: [{ reservationId, contents: [{ itemId: meisseliId, missing: 1 }] }],
    });
    expect(response.status).toBe(200);

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    // 3 reported missing, admin finds 2 of them → 1 missing, 2 returned.
    expect(meisseli).toMatchObject({ returnedAmount: 2, missingAmount: 1 });

    const reports = await prisma.report.findMany({ where: { loanId: loan.id } });
    expect(reports).toHaveLength(1);
    expect(reports[0].content).toContain('Löytyi tarkistuksessa laatikosta');
    expect(reports[0].content).toContain('Ristipäämeisseli (2 kpl)');
  });

  it('clamps the final missing count to the content amount', async () => {
    const { loan, reservationId } = await makeInBoxLoan(`${prefix}-clamp`, [
      { itemId: meisseliId, returnedAmount: 2, missingAmount: 1 },
    ]);

    await post({
      id: loan.id,
      reservationIds: [reservationId],
      boxVerifications: [{ reservationId, contents: [{ itemId: meisseliId, missing: 9 }] }],
    });

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    // 9 clamps to the amount (3): all missing, nothing returned.
    expect(meisseli).toMatchObject({ returnedAmount: 0, missingAmount: 3 });
  });

  it('leaves a content untouched and files no huomio when the admin confirms the report', async () => {
    const { loan, reservationId } = await makeInBoxLoan(`${prefix}-confirm`, [
      { itemId: meisseliId, returnedAmount: 2, missingAmount: 1 },
    ]);

    await post({
      id: loan.id,
      reservationIds: [reservationId],
      // Admin re-states the same missing count the borrower reported.
      boxVerifications: [{ reservationId, contents: [{ itemId: meisseliId, missing: 1 }] }],
    });

    const meisseli = await prisma.boxContentReturn.findUniqueOrThrow({
      where: { reservationId_itemId: { reservationId, itemId: meisseliId } },
    });
    expect(meisseli).toMatchObject({ returnedAmount: 2, missingAmount: 1 });
    expect(await prisma.report.findMany({ where: { loanId: loan.id } })).toHaveLength(0);
  });
});
