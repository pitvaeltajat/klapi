/**
 * A lainattava sijainti and the kama behind it are kept in step from both
 * sides: switching lainattava on/off on Sijainnit, renaming or moving the
 * sijainti there, and moving the kama from a kama editor. Calls the real route
 * handlers with the admin guard stubbed out.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const prefix = `loanable-test-${Date.now()}`;
let adminId: string;

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () => ({ session: { user: { id: adminId, group: Group.ADMIN } }, denied: null }),
}));

const setLoanable = (await import('@/app/api/location/setLoanable/route')).POST;
const updateLocation = (await import('@/app/api/location/updateLocation/route')).POST;
const deleteLocation = (await import('@/app/api/location/deleteLocation/route')).POST;
const patchItem = (await import('@/app/api/item/patchItem/route')).PATCH;

const call = (handler: (r: Request) => Promise<Response>, body: unknown) =>
  handler(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }));

const locationIds: string[] = [];
async function makeLocation(name: string, parentId: string | null = null) {
  const loc = await prisma.location.create({
    data: { id: `${prefix}-loc-${Math.random()}`, name, parentId },
  });
  locationIds.push(loc.id);
  return loc;
}

describe('lainattava sijainti', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    const linked = await prisma.location.findMany({
      where: { id: { in: locationIds } },
      select: { itemId: true },
    });
    await prisma.location.updateMany({ where: { id: { in: locationIds } }, data: { parentId: null, itemId: null } });
    await prisma.location.deleteMany({ where: { id: { in: locationIds } } });
    const itemIds = linked.flatMap((l) => (l.itemId ? [l.itemId] : []));
    await prisma.itemHistory.deleteMany({ where: { OR: [{ itemId: { in: itemIds } }, { actedById: adminId }] } });
    await prisma.item.deleteMany({ where: { name: { startsWith: prefix } } });
    await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('gives the sijainti a kama in its parent, and archives it when switched off', async () => {
    const kalusto = await makeLocation(`${prefix} Kalusto`);
    const pakki = await makeLocation(`${prefix} Pakki`, kalusto.id);

    expect((await call(setLoanable, { id: pakki.id, loanable: true })).status).toBe(200);
    const on = await prisma.location.findUniqueOrThrow({ where: { id: pakki.id }, include: { item: true } });
    expect(on.item).toMatchObject({ name: pakki.name, amount: 1, locationId: kalusto.id, deletedAt: null });

    expect((await call(deleteLocation, { id: pakki.id })).status).toBe(400);

    await call(setLoanable, { id: pakki.id, loanable: false });
    const off = await prisma.location.findUniqueOrThrow({ where: { id: pakki.id } });
    expect(off.itemId).toBeNull();
    const archived = await prisma.item.findUniqueOrThrow({ where: { id: on.item!.id } });
    expect(archived.deletedAt).not.toBeNull();
    locationIds.push(pakki.id);
    await prisma.item.update({ where: { id: archived.id }, data: { name: `${prefix} archived` } });
  });

  it('brings the kama along when the sijainti is renamed or moved', async () => {
    const a = await makeLocation(`${prefix} A`);
    const b = await makeLocation(`${prefix} B`);
    const pakki = await makeLocation(`${prefix} Pakki 2`, a.id);
    await call(setLoanable, { id: pakki.id, loanable: true });

    await call(updateLocation, { id: pakki.id, name: `${prefix} Pakki uusi`, parentId: b.id });
    const loc = await prisma.location.findUniqueOrThrow({ where: { id: pakki.id }, include: { item: true } });
    expect(loc.item).toMatchObject({ name: `${prefix} Pakki uusi`, locationId: b.id });
  });

  it('moves the sijainti when its kama is moved, and refuses a move into itself', async () => {
    const a = await makeLocation(`${prefix} C`);
    const b = await makeLocation(`${prefix} D`);
    const pakki = await makeLocation(`${prefix} Pakki 3`, a.id);
    await call(setLoanable, { id: pakki.id, loanable: true });
    const lokero = await makeLocation(`${prefix} Lokero`, pakki.id);
    const { itemId } = await prisma.location.findUniqueOrThrow({ where: { id: pakki.id } });

    const moved = await patchItem(
      new Request('http://localhost/api', {
        method: 'PATCH',
        body: JSON.stringify({ id: itemId, field: 'locationId', value: b.id }),
      }),
    );
    expect(moved.status).toBe(200);
    expect((await prisma.location.findUniqueOrThrow({ where: { id: pakki.id } })).parentId).toBe(b.id);

    const loop = await patchItem(
      new Request('http://localhost/api', {
        method: 'PATCH',
        body: JSON.stringify({ id: itemId, field: 'locationId', value: lokero.id }),
      }),
    );
    expect(loop.status).toBe(400);
    expect((await prisma.item.findUniqueOrThrow({ where: { id: itemId! } })).locationId).toBe(b.id);
  });
});
