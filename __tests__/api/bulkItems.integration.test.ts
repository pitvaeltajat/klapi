/**
 * Integration tests for `POST /api/item/bulkItems` — the inventory table's
 * bulk actions: archive, restore, promote, set kategoria, set sijainti. The
 * real route runs; auth is stubbed to the actor the test stands in for.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `bulkitems-test-${Date.now()}`;

let actor: { id: string; group: Group };
vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    actor.group === Group.ADMIN
      ? { session: { user: actor }, denied: null }
      : { session: null, denied: NextResponse.json({ message: 'Ei oikeutta' }, { status: 403 }) },
}));

const { POST } = await import('@/app/api/item/bulkItems/route');

const bulk = (body: Record<string, unknown>) =>
  POST(new Request('http://localhost/api/item/bulkItems', { method: 'POST', body: JSON.stringify(body) }));

let adminId: string;
let ids: string[];
const createdCategoryIds: string[] = [];
const createdLocationIds: string[] = [];

const items = () =>
  prisma.item.findMany({
    where: { id: { in: ids } },
    include: { categories: true, location: true },
    orderBy: { id: 'asc' },
  });
const historyOf = (action: string) =>
  prisma.itemHistory.findMany({ where: { itemId: { in: ids }, action: action as never } });

beforeAll(async () => {
  adminId = (
    await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}@test.com`, group: Group.ADMIN },
    })
  ).id;
});

beforeEach(async () => {
  actor = { id: adminId, group: Group.ADMIN };
  await prisma.itemHistory.deleteMany({ where: { itemId: { startsWith: prefix } } });
  await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
  ids = [];
  for (const [i, type] of (['normal', 'normal', 'temporary'] as const).entries()) {
    const item = await prisma.item.create({
      data: { id: `${prefix}-item-${i}`, name: `${prefix} kama ${i}`, amount: 1, type },
    });
    ids.push(item.id);
  }
});

afterAll(async () => {
  await prisma.itemHistory.deleteMany({ where: { itemId: { startsWith: prefix } } });
  await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
  await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.location.deleteMany({ where: { id: { in: createdLocationIds } } });
  await prisma.user.deleteMany({ where: { id: adminId } });
  await prisma.$disconnect();
});

describe('bulkItems', () => {
  it('archives, logging only the kamat that actually changed', async () => {
    await prisma.item.update({ where: { id: ids[1] }, data: { deletedAt: new Date() } });

    expect((await bulk({ action: 'delete', ids })).status).toBe(200);

    expect((await items()).every((i) => i.deletedAt)).toBe(true);
    const logged = await historyOf('ARCHIVED');
    expect(logged.map((h) => h.itemId).sort()).toEqual([ids[0], ids[2]]);
    expect(logged.every((h) => (h.details as { bulk?: boolean }).bulk)).toBe(true);
  });

  it('restores archived kamat', async () => {
    await prisma.item.updateMany({ where: { id: { in: ids } }, data: { deletedAt: new Date() } });

    await bulk({ action: 'restore', ids: [ids[0]] });

    const byId = Object.fromEntries((await items()).map((i) => [i.id, i.deletedAt]));
    expect(byId[ids[0]]).toBeNull();
    expect(byId[ids[1]]).not.toBeNull();
    expect((await historyOf('RESTORED')).map((h) => h.itemId)).toEqual([ids[0]]);
  });

  it('promotes only the temporary kamat in the selection', async () => {
    const response = await bulk({ action: 'promote', ids });
    expect(response.status).toBe(200);

    expect((await items()).map((i) => i.type)).toEqual(['normal', 'normal', 'normal']);
    expect((await historyOf('PROMOTED')).map((h) => h.itemId)).toEqual([ids[2]]);
  });

  it('answers 400 when a promote selection has no temporary kamat', async () => {
    expect((await bulk({ action: 'promote', ids: [ids[0]] })).status).toBe(400);
  });

  it('adds an existing kategoria by id, or creates one from a new name', async () => {
    const existing = await prisma.category.create({ data: { name: `${prefix} Työkalut` } });
    createdCategoryIds.push(existing.id);

    await bulk({ action: 'setCategory', ids: [ids[0]], categoryName: existing.id });
    const response = await bulk({ action: 'setCategory', ids: [ids[1]], categoryName: `${prefix} Uusi` });
    const { category } = (await response.json()) as { category: { id: string; name: string } };
    createdCategoryIds.push(category.id);

    const [a, b] = await items();
    expect(a.categories.map((c) => c.id)).toEqual([existing.id]);
    expect(b.categories.map((c) => c.name)).toEqual([`${prefix} Uusi`]);
  });

  it('sets a sijainti on every selected kama', async () => {
    const response = await bulk({ action: 'setLocation', ids: [ids[0], ids[1]], locationName: `${prefix} Hylly` });
    const { location } = (await response.json()) as { location: { id: string } };
    createdLocationIds.push(location.id);

    const [a, b, c] = await items();
    expect([a.locationId, b.locationId, c.locationId]).toEqual([location.id, location.id, null]);
  });

  it('answers 400 for a missing field or an unknown action', async () => {
    expect((await bulk({ action: 'delete', ids: [] })).status).toBe(400);
    expect((await bulk({ action: 'setCategory', ids })).status).toBe(400);
    expect((await bulk({ action: 'setLocation', ids })).status).toBe(400);
    expect((await bulk({ action: 'melt', ids })).status).toBe(400);
  });

  it('is admin-only', async () => {
    actor = { id: 'someone', group: Group.USER };

    expect((await bulk({ action: 'delete', ids })).status).toBe(403);
    expect((await items()).every((i) => i.deletedAt === null)).toBe(true);
  });
});
