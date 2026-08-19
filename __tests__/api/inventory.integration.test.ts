/**
 * Integration tests for the admin inventory feature.
 *
 * Covers:
 *   - admin-gate on promoteItem, patchItem, bulkItems, getInventory
 *   - promote: type flip, field update, existing reservations unaffected
 *   - bulk delete
 *   - bulk set-category
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, Group, ItemType, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `inv-test-${Date.now()}`;

async function makeUser(group: Group = Group.USER) {
  return prisma.user.create({
    data: {
      id: `${prefix}-user-${Math.random()}`,
      email: `${prefix}-${Math.random()}@test.com`,
      group,
    },
  });
}

async function makeItem(type: ItemType = ItemType.normal, nameSuffix = '') {
  return prisma.item.create({
    data: {
      id: `${prefix}-item-${Math.random()}`,
      name: `Test Item ${nameSuffix}`,
      amount: 3,
      type,
    },
  });
}

// ── helpers that mirror API logic ─────────────────────────────────────────────

function adminGuard(session: { group: Group } | null) {
  if (!session || session.group !== Group.ADMIN) {
    return { error: 'Unauthorized', status: 401 };
  }
  return null;
}

async function promoteItemDirect(
  id: string,
  payload: { name: string; description?: string | null; amount: number; categories: { id?: string; name: string }[]; locationId?: { value: string; label: string } | null },
  session: { group: Group } | null,
) {
  const guard = adminGuard(session);
  if (guard) return guard;

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) return { error: 'Not found', status: 404 };
  if (item.type !== ItemType.temporary) return { error: 'Not temporary', status: 400 };

  const updated = await prisma.item.update({
    where: { id },
    data: {
      type: ItemType.normal,
      name: payload.name,
      description: payload.description ?? null,
      amount: payload.amount,
      location: payload.locationId
        ? {
            connectOrCreate: {
              where: { id: payload.locationId.value },
              create: { name: payload.locationId.value },
            },
          }
        : { disconnect: true },
      categories: {
        set: [],
        connectOrCreate: payload.categories.map((cat) => ({
          create: { name: cat.name },
          where: { id: cat.id ?? '' },
        })),
      },
    },
    include: { categories: true },
  });

  return { data: updated, status: 200 };
}

async function patchItemDirect(
  id: string,
  field: string,
  value: string | number | null,
  session: { group: Group } | null,
) {
  const guard = adminGuard(session);
  if (guard) return guard;

  const allowed = ['name', 'description', 'amount', 'locationId'];
  if (!allowed.includes(field)) return { error: 'Bad field', status: 400 };

  const updated = await prisma.item.update({
    where: { id },
    data: { [field]: value },
  });
  return { data: updated, status: 200 };
}

async function bulkDeleteDirect(ids: string[], session: { group: Group } | null) {
  const guard = adminGuard(session);
  if (guard) return guard;

  // Soft-delete: stamp deletedAt so reservations + loan history stay intact.
  await prisma.item.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date() },
  });
  return { status: 200, deleted: ids.length };
}

async function bulkSetCategoryDirect(
  ids: string[],
  categoryName: string,
  session: { group: Group } | null,
) {
  const guard = adminGuard(session);
  if (guard) return guard;

  const category = await prisma.category.upsert({
    where: { id: `${prefix}-upsert` },
    create: { id: `${prefix}-upsert`, name: categoryName },
    update: {},
  });

  await Promise.all(
    ids.map((id) =>
      prisma.item.update({
        where: { id },
        data: { categories: { connect: { id: category.id } } },
      }),
    ),
  );

  return { status: 200, category };
}

async function getInventoryDirect(session: { group: Group } | null) {
  const guard = adminGuard(session);
  if (guard) return guard;

  const items = await prisma.item.findMany({ include: { categories: true, location: true } });
  return { data: items, status: 200 };
}

// ── fixtures ──────────────────────────────────────────────────────────────────

let admin: Awaited<ReturnType<typeof makeUser>>;
let user: Awaited<ReturnType<typeof makeUser>>;
let kiosk: Awaited<ReturnType<typeof makeUser>>;

const createdItemIds: string[] = [];
const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];

beforeAll(async () => {
  admin = await makeUser(Group.ADMIN);
  user = await makeUser(Group.USER);
  kiosk = await makeUser(Group.KIOSK);
  createdUserIds.push(admin.id, user.id, kiosk.id);
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { item: { id: { in: createdItemIds } } } });
  await prisma.loan.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.item.deleteMany({ where: { id: { in: createdItemIds } } });
  await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.category.deleteMany({ where: { id: `${prefix}-upsert` } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  // clean up items between tests
  if (createdItemIds.length) {
    await prisma.reservation.deleteMany({ where: { item: { id: { in: createdItemIds } } } });
    await prisma.item.deleteMany({ where: { id: { in: createdItemIds } } });
    createdItemIds.length = 0;
  }
  if (createdCategoryIds.length) {
    await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
    createdCategoryIds.length = 0;
  }
});

// ── getInventory authorization ─────────────────────────────────────────────────

describe('getInventory – authorization', () => {
  it('allows ADMIN', async () => {
    const result = await getInventoryDirect({ group: Group.ADMIN });
    expect(result.status).toBe(200);
  });

  it('blocks unauthenticated', async () => {
    const result = await getInventoryDirect(null);
    expect(result.status).toBe(401);
  });

  it('blocks USER', async () => {
    const result = await getInventoryDirect({ group: Group.USER });
    expect(result.status).toBe(401);
  });

  it('blocks KIOSK', async () => {
    const result = await getInventoryDirect({ group: Group.KIOSK });
    expect(result.status).toBe(401);
  });
});

// ── promoteItem authorization ─────────────────────────────────────────────────

describe('promoteItem – authorization', () => {
  it('allows ADMIN to promote', async () => {
    const item = await makeItem(ItemType.temporary, 'promote-auth');
    createdItemIds.push(item.id);

    const result = await promoteItemDirect(
      item.id,
      { name: 'Promoted', amount: 2, categories: [] },
      { group: Group.ADMIN },
    );
    expect(result.status).toBe(200);
  });

  it('blocks unauthenticated', async () => {
    const item = await makeItem(ItemType.temporary);
    createdItemIds.push(item.id);
    const result = await promoteItemDirect(item.id, { name: 'x', amount: 1, categories: [] }, null);
    expect(result.status).toBe(401);
  });

  it('blocks USER', async () => {
    const item = await makeItem(ItemType.temporary);
    createdItemIds.push(item.id);
    const result = await promoteItemDirect(item.id, { name: 'x', amount: 1, categories: [] }, { group: Group.USER });
    expect(result.status).toBe(401);
  });

  it('blocks KIOSK', async () => {
    const item = await makeItem(ItemType.temporary);
    createdItemIds.push(item.id);
    const result = await promoteItemDirect(item.id, { name: 'x', amount: 1, categories: [] }, { group: Group.KIOSK });
    expect(result.status).toBe(401);
  });
});

// ── promoteItem correctness ───────────────────────────────────────────────────

describe('promoteItem – correctness', () => {
  it('flips type from temporary to normal', async () => {
    const item = await makeItem(ItemType.temporary, 'flip');
    createdItemIds.push(item.id);

    const result = await promoteItemDirect(
      item.id,
      { name: 'Promoted Item', amount: 5, categories: [] },
      { group: Group.ADMIN },
    );

    expect(result.status).toBe(200);
    expect((result as { data: typeof item }).data?.type).toBe(ItemType.normal);
  });

  it('updates name, description, amount', async () => {
    const item = await makeItem(ItemType.temporary, 'fields');
    createdItemIds.push(item.id);

    const result = await promoteItemDirect(
      item.id,
      { name: 'New Name', description: 'A description', amount: 7, categories: [] },
      { group: Group.ADMIN },
    );

    const updated = (result as { data: typeof item & { description: string | null; amount: number } }).data;
    expect(updated?.name).toBe('New Name');
    expect(updated?.description).toBe('A description');
    expect(updated?.amount).toBe(7);
  });

  it('rejects promotion of already-normal item', async () => {
    const item = await makeItem(ItemType.normal, 'normal');
    createdItemIds.push(item.id);

    const result = await promoteItemDirect(
      item.id,
      { name: 'x', amount: 1, categories: [] },
      { group: Group.ADMIN },
    );
    expect(result.status).toBe(400);
  });

  it('leaves existing reservations intact after promotion', async () => {
    const item = await makeItem(ItemType.temporary, 'reservations');
    createdItemIds.push(item.id);

    const loanUser = await makeUser(Group.USER);
    createdUserIds.push(loanUser.id);

    const loan = await prisma.loan.create({
      data: {
        id: `${prefix}-loan-${Math.random()}`,
        userId: loanUser.id,
        status: LoanStatus.ACCEPTED,
        startTime: new Date('2027-01-01'),
        endTime: new Date('2027-01-07'),
        reservations: {
          create: [{ amount: 1, itemId: item.id, status: ReservationStatus.ACCEPTED }],
        },
      },
      include: { reservations: true },
    });

    await promoteItemDirect(
      item.id,
      { name: 'Promoted With Reservations', amount: 3, categories: [] },
      { group: Group.ADMIN },
    );

    const reservations = await prisma.reservation.findMany({ where: { loanId: loan.id } });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].itemId).toBe(item.id);
    expect(reservations[0].status).toBe(ReservationStatus.ACCEPTED);

    await prisma.reservation.deleteMany({ where: { loanId: loan.id } });
    await prisma.loan.delete({ where: { id: loan.id } });
  });
});

// ── patchItem authorization ───────────────────────────────────────────────────

describe('patchItem – authorization', () => {
  it('allows ADMIN', async () => {
    const item = await makeItem(ItemType.normal, 'patch-auth');
    createdItemIds.push(item.id);
    const result = await patchItemDirect(item.id, 'name', 'Updated', { group: Group.ADMIN });
    expect(result.status).toBe(200);
  });

  it('blocks unauthenticated', async () => {
    const item = await makeItem(ItemType.normal);
    createdItemIds.push(item.id);
    const result = await patchItemDirect(item.id, 'name', 'x', null);
    expect(result.status).toBe(401);
  });

  it('blocks USER', async () => {
    const item = await makeItem(ItemType.normal);
    createdItemIds.push(item.id);
    const result = await patchItemDirect(item.id, 'name', 'x', { group: Group.USER });
    expect(result.status).toBe(401);
  });
});

// ── bulkItems delete ──────────────────────────────────────────────────────────

describe('bulkItems delete – authorization', () => {
  it('allows ADMIN to bulk-delete', async () => {
    const a = await makeItem(ItemType.normal, 'bulk-a');
    const b = await makeItem(ItemType.normal, 'bulk-b');
    createdItemIds.push(a.id, b.id);

    const result = await bulkDeleteDirect([a.id, b.id], { group: Group.ADMIN });
    expect(result.status).toBe(200);

    const rows = await prisma.item.findMany({ where: { id: { in: [a.id, b.id] } } });
    expect(rows).toHaveLength(2);
    expect(rows.every((it) => it.deletedAt !== null)).toBe(true);
  });

  it('blocks unauthenticated', async () => {
    const item = await makeItem();
    createdItemIds.push(item.id);
    const result = await bulkDeleteDirect([item.id], null);
    expect(result.status).toBe(401);
  });

  it('blocks USER', async () => {
    const item = await makeItem();
    createdItemIds.push(item.id);
    const result = await bulkDeleteDirect([item.id], { group: Group.USER });
    expect(result.status).toBe(401);
  });
});

describe('bulkItems delete – correctness', () => {
  it('soft-archives exactly the specified items and leaves others active', async () => {
    const a = await makeItem(ItemType.normal, 'del-a');
    const b = await makeItem(ItemType.normal, 'del-b');
    const c = await makeItem(ItemType.normal, 'del-c-keep');
    createdItemIds.push(a.id, b.id, c.id);

    await bulkDeleteDirect([a.id, b.id], { group: Group.ADMIN });

    const all = await prisma.item.findMany({ where: { id: { in: [a.id, b.id, c.id] } } });
    expect(all).toHaveLength(3);
    const byId = Object.fromEntries(all.map((it) => [it.id, it]));
    expect(byId[a.id].deletedAt).not.toBeNull();
    expect(byId[b.id].deletedAt).not.toBeNull();
    expect(byId[c.id].deletedAt).toBeNull();
  });

  it('preserves the reservations of soft-archived items', async () => {
    const item = await makeItem(ItemType.normal, 'del-history');
    const user = await makeUser();
    createdItemIds.push(item.id);
    createdUserIds.push(user.id);

    const loan = await prisma.loan.create({
      data: {
        loaner: 'tester',
        startTime: new Date('2026-01-01'),
        endTime: new Date('2026-01-02'),
        userId: user.id,
        status: LoanStatus.RETURNED,
        reservations: {
          create: [{ item: { connect: { id: item.id } }, amount: 1, status: ReservationStatus.RETURNED }],
        },
      },
    });

    await bulkDeleteDirect([item.id], { group: Group.ADMIN });

    const reservations = await prisma.reservation.findMany({ where: { loanId: loan.id } });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].itemId).toBe(item.id);
  });
});

// ── bulkItems setCategory ─────────────────────────────────────────────────────

describe('bulkItems setCategory – authorization', () => {
  it('allows ADMIN to set category', async () => {
    const item = await makeItem(ItemType.normal, 'cat-auth');
    createdItemIds.push(item.id);

    const result = await bulkSetCategoryDirect([item.id], 'TestCat', { group: Group.ADMIN });
    expect(result.status).toBe(200);
    createdCategoryIds.push(`${prefix}-upsert`);
  });

  it('blocks unauthenticated', async () => {
    const item = await makeItem();
    createdItemIds.push(item.id);
    const result = await bulkSetCategoryDirect([item.id], 'Cat', null);
    expect(result.status).toBe(401);
  });

  it('blocks USER', async () => {
    const item = await makeItem();
    createdItemIds.push(item.id);
    const result = await bulkSetCategoryDirect([item.id], 'Cat', { group: Group.USER });
    expect(result.status).toBe(401);
  });
});

describe('bulkItems setCategory – correctness', () => {
  it('connects category to all specified items', async () => {
    const a = await makeItem(ItemType.normal, 'cat-a');
    const b = await makeItem(ItemType.normal, 'cat-b');
    createdItemIds.push(a.id, b.id);

    await bulkSetCategoryDirect([a.id, b.id], 'Outdoor', { group: Group.ADMIN });
    createdCategoryIds.push(`${prefix}-upsert`);

    const itemsWithCat = await prisma.item.findMany({
      where: { id: { in: [a.id, b.id] } },
      include: { categories: true },
    });

    for (const item of itemsWithCat) {
      expect(item.categories.some((c: { name: string }) => c.name === 'Outdoor')).toBe(true);
    }
  });
});
