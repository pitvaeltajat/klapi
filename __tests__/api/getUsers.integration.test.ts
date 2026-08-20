/**
 * Integration tests for `GET /api/users/getUsers` — the loaner picker's source.
 *
 * The ordering is the point: the picker lists people by name, and Finnish sorts
 * `ä å ö` after `z`, which the database's own collation (usually en_US) gets
 * wrong. The route asks for `fi-FI-x-icu` explicitly, so this suite also fails
 * loudly on a Postgres built without ICU rather than shipping a jumbled list.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `getusers-test-${Date.now()}`;

vi.mock('@/utils/apiAuth', () => ({
  requireAdminOrKiosk: async () => ({ session: { user: { group: Group.ADMIN } }, denied: null }),
}));

const { GET } = await import('@/app/api/users/getUsers/route');

/** The route lists everyone; other suites' rows are none of this one's business. */
async function listed() {
  const response = await GET();
  expect(response.status).toBe(200);
  const users: { id: string; email: string | null; name: string | null }[] = await response.json();
  return users.filter((user) => user.id.startsWith(prefix));
}

const make = (suffix: string, data: { name?: string | null; group?: Group; deleted?: boolean }) =>
  prisma.user.create({
    data: {
      id: `${prefix}-${suffix}`,
      email: `${prefix}-${suffix}@test.com`,
      name: data.name ?? null,
      group: data.group ?? Group.USER,
      deletedAt: data.deleted ? new Date() : null,
    },
  });

describe('getUsers', () => {
  beforeAll(async () => {
    await make('zeta', { name: 'Zeta Testi' });
    await make('ampari', { name: 'Ämpäri Testi' });
    await make('alpo', { name: 'Alpo Testi' });
    await make('nameless', { name: null });
    await make('deleted', { name: 'Deleted Testi', deleted: true });
    await make('kiosk', { name: 'Kiosk Testi', group: Group.KIOSK });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('sorts by name in Finnish order — ä after z, not next to a', async () => {
    const names = (await listed()).map((user) => user.name).filter(Boolean);
    expect(names).toEqual(['Alpo Testi', 'Zeta Testi', 'Ämpäri Testi']);
  });

  it('files a nameless account under its address', async () => {
    // `getusers-…@test.com` sorts by its own first letter, between Alpo and Zeta.
    const labels = (await listed()).map((user) => user.name || user.email);
    expect(labels).toEqual([
      'Alpo Testi',
      `${prefix}-nameless@test.com`,
      'Zeta Testi',
      'Ämpäri Testi',
    ]);
  });

  it('leaves out deleted accounts and the kiosk terminal', async () => {
    const ids = (await listed()).map((user) => user.id);
    expect(ids).not.toContain(`${prefix}-deleted`);
    expect(ids).not.toContain(`${prefix}-kiosk`);
  });
});
