/**
 * Integration tests for `POST /api/item/editItem`, focused on sijainti.
 *
 * Unlike the older suites here, this one calls the real route handler with the
 * admin guard stubbed out — the point is the route's own three-way sijainti
 * contract (absent = leave alone, null = clear, option = connect or create),
 * which a mirrored copy of the logic could not catch a regression in.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `edititem-test-${Date.now()}`;

let adminId: string;

// The route only reads `session.user.id` off the guard, so a minimal session
// is enough. Kept as a mutable holder so a test could deny if it needed to.
const guard: { admin: boolean } = { admin: true };

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    guard.admin
      ? { session: { user: { id: adminId, group: Group.ADMIN } }, denied: null }
      : { session: null, denied: new Response(null, { status: 401 }) },
}));

const { POST } = await import('@/app/api/item/editItem/route');

const post = (body: unknown) =>
  POST(new Request('http://localhost/api/item/editItem', { method: 'POST', body: JSON.stringify(body) }));

async function makeItem(data: { locationId?: string | null } = {}) {
  return prisma.item.create({
    data: {
      id: `${prefix}-item-${Math.random()}`,
      name: 'Test Item',
      amount: 3,
      locationId: data.locationId ?? null,
    },
  });
}

async function makeLocation(name: string) {
  return prisma.location.create({ data: { id: `${prefix}-loc-${Math.random()}`, name } });
}

/** The edit dialog always sends the whole form; these are the untouched fields. */
const base = (id: string) => ({ id, name: 'Test Item', description: null, amount: 3, categories: [] });

describe('editItem — sijainti', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
  });

  beforeEach(() => {
    guard.admin = true;
  });

  afterAll(async () => {
    await prisma.itemHistory.deleteMany({ where: { item: { id: { startsWith: prefix } } } });
    await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.location.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.location.deleteMany({ where: { name: `${prefix}-brand-new` } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('connects an existing sijainti', async () => {
    const location = await makeLocation('Kolon vessa');
    const item = await makeItem();

    const res = await post({ ...base(item.id), locationId: { value: location.id, label: location.name } });
    expect(res.status).toBe(200);

    const after = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(after.locationId).toBe(location.id);
  });

  it('moves a kama from one sijainti to another', async () => {
    const from = await makeLocation('Varasto A');
    const to = await makeLocation('Varasto B');
    const item = await makeItem({ locationId: from.id });

    await post({ ...base(item.id), locationId: { value: to.id, label: to.name } });

    const after = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(after.locationId).toBe(to.id);
  });

  it('clears the sijainti when the picker is emptied', async () => {
    const location = await makeLocation('Kolon vessa');
    const item = await makeItem({ locationId: location.id });

    await post({ ...base(item.id), locationId: null });

    const after = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(after.locationId).toBeNull();
    // Clearing the kama's sijainti must not delete the Location itself — other
    // kamat point at it.
    expect(await prisma.location.findUnique({ where: { id: location.id } })).not.toBeNull();
  });

  it('leaves the sijainti alone when the key is absent', async () => {
    const location = await makeLocation('Kolon vessa');
    const item = await makeItem({ locationId: location.id });

    await post(base(item.id));

    const after = await prisma.item.findUniqueOrThrow({ where: { id: item.id } });
    expect(after.locationId).toBe(location.id);
  });

  it('mints a Location for an option the admin typed', async () => {
    const item = await makeItem();
    const typed = `${prefix}-brand-new`;

    // CreatableSelect puts the typed text in `value` for a new option.
    await post({ ...base(item.id), locationId: { value: typed, label: typed } });

    const after = await prisma.item.findUniqueOrThrow({
      where: { id: item.id },
      include: { location: true },
    });
    expect(after.location?.name).toBe(typed);
  });

  it('records the sijainti change in the item history', async () => {
    const from = await makeLocation('Varasto A');
    const to = await makeLocation('Varasto B');
    const item = await makeItem({ locationId: from.id });

    await post({ ...base(item.id), locationId: { value: to.id, label: to.name } });

    const entry = await prisma.itemHistory.findFirstOrThrow({
      where: { itemId: item.id, action: 'UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    const changed = (entry.details as { changed: Record<string, { from: string; to: string }> })
      .changed;
    expect(changed.location).toEqual({ from: 'Varasto A', to: 'Varasto B' });
  });

  it('writes no history entry when nothing changed', async () => {
    const location = await makeLocation('Kolon vessa');
    const item = await makeItem({ locationId: location.id });

    await post({ ...base(item.id), locationId: { value: location.id, label: location.name } });

    expect(await prisma.itemHistory.count({ where: { itemId: item.id } })).toBe(0);
  });
});
