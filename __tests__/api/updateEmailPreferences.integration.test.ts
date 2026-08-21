/**
 * Integration tests for `user/updateEmailPreferences`.
 *
 * The interesting part is the authorization rule the admin user page added:
 * an ADMIN may edit somebody else's toggles, a plain USER may only ever edit
 * their own. The route is exercised through its exported POST handler with a
 * stubbed session, the same way `kioskPassword` is tested.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `prefs-${Date.now()}`;

// `requireUser` reads `auth()` — v5's replacement for the old session read — so
// that is what the tests drive. Mocking `@/lib/auth` rather than `next-auth`
// keeps the whole NextAuth config out of the test: the route only ever reaches
// that one export.
const auth = vi.hoisted(() => vi.fn());
vi.mock('@/lib/auth', () => ({ auth }));

const { POST } = await import('@/app/api/user/updateEmailPreferences/route');

function asUser(id: string, group: Group) {
  auth.mockResolvedValue({ user: { id, group } });
}

function post(body: unknown) {
  return POST(
    new Request('http://localhost/api/user/updateEmailPreferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

async function createUser(tag: string, group: Group = Group.USER) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-${tag}-${Math.random()}`,
      email: `${testPrefix}-${tag}-${Math.random()}@test.example`,
      name: `User ${tag}`,
      group,
      emailWeeklyReminder: true,
      emailExpiringReminder: false,
    },
  });
}

const cleanUp = () => prisma.user.deleteMany({ where: { id: { startsWith: testPrefix } } });

beforeAll(cleanUp);
beforeEach(async () => {
  auth.mockReset();
  await cleanUp();
});
afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe('updateEmailPreferences', () => {
  it('updates the caller’s own preferences', async () => {
    const user = await createUser('self');
    asUser(user.id, Group.USER);

    const response = await post({ emailWeeklyReminder: false });

    expect(response.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.emailWeeklyReminder).toBe(false);
  });

  it('lets an ADMIN update someone else’s preferences', async () => {
    const admin = await createUser('admin', Group.ADMIN);
    const target = await createUser('target');
    asUser(admin.id, Group.ADMIN);

    const response = await post({ userId: target.id, emailExpiringReminder: true });

    expect(response.status).toBe(200);
    const after = await prisma.user.findUnique({ where: { id: target.id } });
    expect(after?.emailExpiringReminder).toBe(true);
  });

  it('refuses a plain USER naming someone else — and changes nothing', async () => {
    const user = await createUser('nosy');
    const target = await createUser('victim');
    asUser(user.id, Group.USER);

    const response = await post({ userId: target.id, emailWeeklyReminder: false });

    expect(response.status).toBe(401);
    // Neither the target nor the caller may be touched: a rejected request that
    // quietly edited the caller's own row would be worse than the 401.
    expect((await prisma.user.findUnique({ where: { id: target.id } }))?.emailWeeklyReminder).toBe(
      true,
    );
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.emailWeeklyReminder).toBe(
      true,
    );
  });

  it('accepts a USER naming their own id explicitly', async () => {
    const user = await createUser('explicit');
    asUser(user.id, Group.USER);

    const response = await post({ userId: user.id, emailWeeklyReminder: false });

    expect(response.status).toBe(200);
    expect((await prisma.user.findUnique({ where: { id: user.id } }))?.emailWeeklyReminder).toBe(
      false,
    );
  });

  it('leaves omitted toggles alone', async () => {
    const user = await createUser('partial');
    asUser(user.id, Group.USER);

    await post({ emailExpiringReminder: true });

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after?.emailExpiringReminder).toBe(true);
    expect(after?.emailWeeklyReminder).toBe(true);
  });

  it('refuses an unauthenticated caller', async () => {
    auth.mockResolvedValue(null);

    const response = await post({ emailWeeklyReminder: false });

    expect(response.status).toBe(401);
  });
});
