/**
 * Integration tests for the loan templates ("valmiit setit") data path.
 *
 * The routes are thin wrappers over the helpers in `utils/templateQueries`, so
 * these exercise those against the real database. The bit worth guarding is the
 * interaction with item soft-delete: a template can outlive its items, and both
 * the read filter and the update transaction have to behave when it does.
 *
 * Requires a running PostgreSQL database (pnpm test starts one).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, LoanStatus, ReservationStatus, ItemType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  templateItemsInclude,
  toTemplateView,
  normalizeTemplateItems,
  allItemsLoanable,
  templateItemsFromLoan,
} from '@/utils/templateQueries';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `template-test-${Date.now()}`;

let tentId: string;
let stoveId: string;
let axeId: string;
let temporaryId: string;
let userId: string;

const readTemplate = async (id: string) => {
  const template = await prisma.template.findUniqueOrThrow({
    where: { id },
    include: templateItemsInclude,
  });
  return toTemplateView(template);
};

/** Mirrors the replace-the-list transaction in `updateTemplate`. */
const updateItems = (id: string, items: { itemId: string; amount: number }[]) =>
  prisma.$transaction(async (tx) => {
    await tx.templateItem.deleteMany({ where: { templateId: id, item: { deletedAt: null } } });
    return tx.template.update({ where: { id }, data: { items: { create: items } } });
  });

beforeAll(async () => {
  const item = async (name: string, amount: number, type: ItemType = ItemType.normal) =>
    (
      await prisma.item.create({
        data: { id: `${testPrefix}-${name}`, name: `${testPrefix} ${name}`, amount, type },
      })
    ).id;

  tentId = await item('tent', 4);
  stoveId = await item('stove', 5);
  axeId = await item('axe', 2);
  temporaryId = await item('temp', 1, ItemType.temporary);
  userId = (
    await prisma.user.create({
      data: { id: `${testPrefix}-user`, name: 'Template Tester', email: `${testPrefix}@test.com` },
    })
  ).id;
});

beforeEach(async () => {
  await prisma.template.deleteMany({ where: { name: { startsWith: testPrefix } } });
  await prisma.loan.deleteMany({ where: { userId } });
  // Undo any archiving a previous test did.
  await prisma.item.updateMany({
    where: { id: { startsWith: testPrefix } },
    data: { deletedAt: null },
  });
});

afterAll(async () => {
  await prisma.template.deleteMany({ where: { name: { startsWith: testPrefix } } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.item.deleteMany({ where: { id: { startsWith: testPrefix } } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

const createTemplate = (items: { itemId: string; amount: number }[], name = `${testPrefix} set`) =>
  prisma.template.create({ data: { name, items: { create: items } } });

describe('normalizeTemplateItems', () => {
  it('accepts a well-formed list and collapses duplicate items', () => {
    expect(
      normalizeTemplateItems([
        { itemId: 'a', amount: 2 },
        { itemId: 'b', amount: 1 },
        { itemId: 'a', amount: 3 },
      ]),
    ).toEqual([
      { itemId: 'a', amount: 3 },
      { itemId: 'b', amount: 1 },
    ]);
  });

  it.each([
    ['not an array', 'nope'],
    ['a zero amount', [{ itemId: 'a', amount: 0 }]],
    ['a negative amount', [{ itemId: 'a', amount: -1 }]],
    ['a fractional amount', [{ itemId: 'a', amount: 1.5 }]],
    ['a missing itemId', [{ amount: 1 }]],
    ['a non-numeric amount', [{ itemId: 'a', amount: '2' }]],
  ])('rejects %s', (_label, payload) => {
    expect(normalizeTemplateItems(payload)).toBeNull();
  });
});

describe('allItemsLoanable', () => {
  it('accepts live normal items', async () => {
    expect(await allItemsLoanable([tentId, stoveId])).toBe(true);
  });

  it('rejects unknown, temporary, and archived items', async () => {
    expect(await allItemsLoanable(['does-not-exist'])).toBe(false);
    expect(await allItemsLoanable([temporaryId])).toBe(false);

    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: new Date() } });
    expect(await allItemsLoanable([axeId])).toBe(false);
  });
});

describe('reading a template whose items get archived', () => {
  it('hides archived rows from the loaner-facing view without deleting them', async () => {
    const template = await createTemplate([
      { itemId: tentId, amount: 4 },
      { itemId: axeId, amount: 2 },
    ]);

    expect((await readTemplate(template.id)).items).toHaveLength(2);

    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: new Date() } });

    const afterArchive = await readTemplate(template.id);
    expect(afterArchive.items.map((entry) => entry.itemId)).toEqual([tentId]);
    // The row itself survives — archiving an item must not edit every template.
    expect(await prisma.templateItem.count({ where: { templateId: template.id } })).toBe(2);

    // Restoring the item brings it back with its original amount intact.
    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: null } });
    const afterRestore = await readTemplate(template.id);
    expect(afterRestore.items).toHaveLength(2);
    expect(afterRestore.items.find((entry) => entry.itemId === axeId)?.amount).toBe(2);
  });

  it('reports stock alongside the suggested amount', async () => {
    const template = await createTemplate([{ itemId: stoveId, amount: 2 }]);
    expect((await readTemplate(template.id)).items[0]).toMatchObject({ amount: 2, stock: 5 });
  });
});

describe('updating a template', () => {
  it('replaces the visible rows but leaves archived ones alone', async () => {
    const template = await createTemplate([
      { itemId: tentId, amount: 4 },
      { itemId: axeId, amount: 2 },
    ]);

    // The axe is archived, so the admin's form never showed it — and the list
    // they submit back can't include it.
    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: new Date() } });
    await updateItems(template.id, [
      { itemId: tentId, amount: 1 },
      { itemId: stoveId, amount: 3 },
    ]);

    const visible = await readTemplate(template.id);
    expect(visible.items.map((entry) => [entry.itemId, entry.amount])).toEqual(
      expect.arrayContaining([
        [tentId, 1],
        [stoveId, 3],
      ]),
    );
    expect(visible.items).toHaveLength(2);

    // The unseen axe row is still there and comes back on restore.
    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: null } });
    expect((await readTemplate(template.id)).items).toHaveLength(3);
  });
});

describe('templateItemsFromLoan', () => {
  const createLoan = async (
    reservations: { itemId: string; amount: number; status?: ReservationStatus }[],
  ) =>
    prisma.loan.create({
      data: {
        userId,
        status: LoanStatus.ACCEPTED,
        startTime: new Date('2026-08-01'),
        endTime: new Date('2026-08-03'),
        description: `${testPrefix} loan`,
        reservations: {
          create: reservations.map((reservation) => ({
            itemId: reservation.itemId,
            amount: reservation.amount,
            status: reservation.status ?? ReservationStatus.ACCEPTED,
          })),
        },
      },
    });

  it('sums repeated reservations for the same item', async () => {
    const loan = await createLoan([
      { itemId: tentId, amount: 2 },
      { itemId: tentId, amount: 1 },
      { itemId: stoveId, amount: 1 },
    ]);

    const items = await templateItemsFromLoan(loan.id);
    expect(items).toEqual(
      expect.arrayContaining([
        { itemId: tentId, amount: 3 },
        { itemId: stoveId, amount: 1 },
      ]),
    );
    expect(items).toHaveLength(2);
  });

  it('skips rejected lines and temporary and archived items', async () => {
    await prisma.item.update({ where: { id: axeId }, data: { deletedAt: new Date() } });
    const loan = await createLoan([
      { itemId: tentId, amount: 1 },
      { itemId: stoveId, amount: 1, status: ReservationStatus.REJECTED },
      { itemId: temporaryId, amount: 1 },
      { itemId: axeId, amount: 1 },
    ]);

    expect(await templateItemsFromLoan(loan.id)).toEqual([{ itemId: tentId, amount: 1 }]);
  });
});

describe('deleting a template', () => {
  it('cascades to its item rows and leaves the items themselves alone', async () => {
    const template = await createTemplate([{ itemId: tentId, amount: 4 }]);

    await prisma.template.delete({ where: { id: template.id } });

    expect(await prisma.templateItem.count({ where: { templateId: template.id } })).toBe(0);
    expect(await prisma.item.findUnique({ where: { id: tentId } })).not.toBeNull();
  });
});
