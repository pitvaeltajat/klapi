/**
 * Integration tests for adding an "oma kama" while editing a loan —
 * `POST /api/loan/updateLoan` with a reservation carrying a `custom-…` id and a
 * name. The real route handler runs; the calendar sync is stubbed because it
 * would call `after()` outside a request scope.
 *
 * The rules under test are the ones a mirrored copy of the logic could not
 * catch a regression in: the browser-minted id is kept (that is what makes the
 * photo uploaded under it line up), custom kamat skip the availability sums,
 * and a failed edit leaves no orphan Item rows behind.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `updateloan-custom-test-${Date.now()}`;

let adminId: string;
let itemId: string;

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({
    session: { user: { id: adminId, group: Group.ADMIN } },
    denied: null,
  }),
}));

vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));

const { POST: updateLoan } = await import('@/app/api/loan/updateLoan/route');

const start = new Date('2026-11-01T09:00:00Z');
const end = new Date('2026-11-05T09:00:00Z');

/** The shape `utils/customItems.newCustomItemId()` mints in the browser. */
const customId = () => `custom-${crypto.randomUUID()}`;

const edit = (body: Record<string, unknown>) =>
  updateLoan(
    new Request('http://localhost/api/loan/updateLoan', {
      method: 'POST',
      body: JSON.stringify({ startTime: start, endTime: end, description: 'Retki', ...body }),
    }),
  );

async function makeLoan() {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId: adminId,
      startTime: start,
      endTime: end,
      status: LoanStatus.ACCEPTED,
      reservations: { create: [{ itemId, amount: 1, status: ReservationStatus.ACCEPTED }] },
    },
  });
}

/** The catalogue reservation the loan already had, as the client sends it back. */
const keepExisting = { amount: 1, item: { connect: { id: '' } } };

describe('updateLoan — omat kamat', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Trangia', amount: 2 },
    });
    itemId = item.id;
    keepExisting.item.connect.id = itemId;
  });

  beforeEach(async () => {
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
    await prisma.item.deleteMany({ where: { type: 'temporary', name: { startsWith: prefix } } });
  });

  afterAll(async () => {
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
    await prisma.item.deleteMany({ where: { type: 'temporary', name: { startsWith: prefix } } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('creates the temporary item under the id the browser minted', async () => {
    const loan = await makeLoan();
    const id = customId();

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 2, name: `${prefix} makuupussi`, item: { connect: { id } } }],
    });
    expect(response.status).toBe(200);

    // The photo is already in S3 under this key, so the row has to claim it.
    const created = await prisma.item.findUnique({ where: { id } });
    expect(created).toMatchObject({ name: `${prefix} makuupussi`, amount: 2, type: 'temporary' });

    const reservations = await prisma.reservation.findMany({ where: { loanId: loan.id } });
    expect(reservations.map((r) => r.itemId).sort()).toEqual([itemId, id].sort());
  });

  it('gives the new reservation the status the loan is already in', async () => {
    const loan = await makeLoan();
    await prisma.reservation.updateMany({
      where: { loanId: loan.id },
      data: { status: ReservationStatus.INUSE },
    });
    const id = customId();

    await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 1, name: `${prefix} kirves`, item: { connect: { id } } }],
    });

    const added = await prisma.reservation.findFirst({ where: { loanId: loan.id, itemId: id } });
    expect(added?.status).toBe(ReservationStatus.INUSE);
  });

  it('records the added kama in the loan history by name', async () => {
    const loan = await makeLoan();
    const id = customId();

    await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 1, name: `${prefix} kirves`, item: { connect: { id } } }],
    });

    const entry = await prisma.loanHistory.findFirst({
      where: { loanId: loan.id, action: 'UPDATED' },
    });
    const details = entry?.details as { added: Array<{ itemId: string; name: string }> };
    expect(details.added).toEqual([{ itemId: id, name: `${prefix} kirves`, amount: 1 }]);
  });

  it('does not check an oma kama against the catalogue availability', async () => {
    const loan = await makeLoan();
    const id = customId();

    // 50 of something the troop does not own — nothing to be short of.
    const response = await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 50, name: `${prefix} omat sukset`, item: { connect: { id } } }],
    });
    expect(response.status).toBe(200);
  });

  it('refuses a custom row with no name', async () => {
    const loan = await makeLoan();
    const id = customId();

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 1, item: { connect: { id } } }],
    });
    expect(response.status).toBe(400);
    expect(await prisma.item.findUnique({ where: { id } })).toBeNull();
  });

  it('still rejects an unknown catalogue id, name or no name', async () => {
    const loan = await makeLoan();

    const response = await edit({
      id: loan.id,
      reservations: [
        keepExisting,
        { amount: 1, name: 'Keksitty', item: { connect: { id: `${prefix}-ghost` } } },
      ],
    });
    expect(response.status).toBe(400);
    expect(await prisma.item.findUnique({ where: { id: `${prefix}-ghost` } })).toBeNull();
  });

  it('leaves no temporary item behind when the edit is rejected', async () => {
    const loan = await makeLoan();
    const id = customId();

    // 3 of an item there are 2 of: the whole edit fails, custom row and all.
    const response = await edit({
      id: loan.id,
      reservations: [
        { amount: 3, item: { connect: { id: itemId } } },
        { amount: 1, name: `${prefix} pilkkionki`, item: { connect: { id } } },
      ],
    });
    expect(response.status).toBe(400);
    expect(await prisma.item.findUnique({ where: { id } })).toBeNull();
  });

  it('falls back to a generated id when the minted one is taken', async () => {
    const loan = await makeLoan();
    const id = customId();
    // A previous loan already created (and archived) a kama under this key.
    await prisma.item.create({
      data: { id, name: `${prefix} vanha`, amount: 1, type: 'temporary', deletedAt: new Date() },
    });

    const response = await edit({
      id: loan.id,
      reservations: [keepExisting, { amount: 1, name: `${prefix} uusi`, item: { connect: { id } } }],
    });
    expect(response.status).toBe(200);

    // The archived row is untouched and the new kama got an id of its own.
    expect(await prisma.item.findUnique({ where: { id } })).toMatchObject({
      name: `${prefix} vanha`,
    });
    const added = await prisma.reservation.findFirst({
      where: { loanId: loan.id, itemId: { not: itemId } },
      include: { item: true },
    });
    expect(added?.item.name).toBe(`${prefix} uusi`);
    expect(added?.itemId).not.toBe(id);
  });
});
