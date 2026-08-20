/**
 * Integration tests for the Google Workspace → Klapi user sync
 * (utils/userSync).
 *
 * The roster is handed in directly, so these exercise the reconciliation and
 * its guards without a service-account key or a network call. What Google
 * itself returns is `utils/googleWorkspace`'s problem.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { syncWorkspaceUsers, UserSyncAbort } from '@/utils/userSync';
import type { WorkspaceMember } from '@/utils/googleWorkspace';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `wsync-${Date.now()}`;
const DOMAIN = `${testPrefix}.example`;

/** Domain-scoped email, so these rows never collide with seed/other suites. */
const at = (local: string) => `${local}@${DOMAIN}`;

const member = (local: string, overrides: Partial<WorkspaceMember> = {}): WorkspaceMember => ({
  email: at(local),
  name: local,
  active: true,
  ...overrides,
});

async function createKlapiUser(
  local: string,
  data: { group?: Group; name?: string; deletedAt?: Date; deletedBySync?: boolean } = {},
) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-${local}-${Math.random()}`,
      email: at(local),
      name: data.name ?? local,
      group: data.group ?? Group.USER,
      deletedAt: data.deletedAt ?? null,
      deletedBySync: data.deletedBySync ?? false,
    },
  });
}

/** Every row this suite could have touched — governed rows plus the exempt ones. */
async function cleanUsers() {
  await prisma.user.deleteMany({ where: { email: { endsWith: `@${DOMAIN}` } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: testPrefix } } });
}

const sync = (
  roster: WorkspaceMember[],
  options: Partial<Parameters<typeof syncWorkspaceUsers>[1]> = {},
) => syncWorkspaceUsers(roster, { domain: DOMAIN, ...options });

beforeAll(cleanUsers);
beforeEach(cleanUsers);
afterAll(async () => {
  await cleanUsers();
  await prisma.$disconnect();
});

describe('syncWorkspaceUsers — provisioning', () => {
  it('creates a USER row for an active member who has none', async () => {
    const result = await sync([member('newbie', { name: 'New Bie' })]);

    expect(result.created).toEqual([at('newbie')]);
    const created = await prisma.user.findUnique({ where: { email: at('newbie') } });
    expect(created).toMatchObject({ name: 'New Bie', group: Group.USER, deletedAt: null });
  });

  it('leaves an existing live member alone', async () => {
    await createKlapiUser('steady', { name: 'Steady Eddie' });

    const result = await sync([member('steady', { name: 'Steady Eddie' })]);

    expect(result).toMatchObject({ created: [], renamed: [], restored: [], deactivated: [] });
  });

  it('refreshes a name that drifted from the directory', async () => {
    await createKlapiUser('married', { name: 'Vanha Nimi' });

    const result = await sync([member('married', { name: 'Uusi Nimi' })]);

    expect(result.renamed).toEqual([at('married')]);
    const user = await prisma.user.findUnique({ where: { email: at('married') } });
    expect(user?.name).toBe('Uusi Nimi');
  });

  it('does not blank a Klapi name when Workspace has none', async () => {
    await createKlapiUser('named', { name: 'Kept Name' });

    await sync([member('named', { name: null })]);

    const user = await prisma.user.findUnique({ where: { email: at('named') } });
    expect(user?.name).toBe('Kept Name');
  });

  it('preserves an ADMIN group on an existing member', async () => {
    await createKlapiUser('boss', { group: Group.ADMIN });

    await sync([member('boss'), member('other')]);

    const user = await prisma.user.findUnique({ where: { email: at('boss') } });
    expect(user?.group).toBe(Group.ADMIN);
  });
});

describe('syncWorkspaceUsers — deactivation', () => {
  it('soft-deletes a member who vanished from the roster', async () => {
    await createKlapiUser('gone');

    const result = await sync([member('present')]);

    expect(result.deactivated).toEqual([at('gone')]);
    const user = await prisma.user.findUnique({ where: { email: at('gone') } });
    expect(user?.deletedAt).toBeInstanceOf(Date);
    expect(user?.deletedBySync).toBe(true);
  });

  it('soft-deletes a member who is present but suspended', async () => {
    await createKlapiUser('suspended');

    const result = await sync([member('suspended', { active: false }), member('present')]);

    expect(result.deactivated).toEqual([at('suspended')]);
  });

  it('leaves the loans of a deactivated user intact', async () => {
    const user = await createKlapiUser('loaner');
    const item = await prisma.item.create({
      data: { id: `${testPrefix}-item`, name: 'Teltta', amount: 1 },
    });
    const loan = await prisma.loan.create({
      data: {
        id: `${testPrefix}-loan`,
        userId: user.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 86_400_000),
        description: 'Sync test',
        reservations: { create: [{ amount: 1, itemId: item.id }] },
      },
    });

    await sync([member('present')]);

    const survivor = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(survivor).not.toBeNull();

    await prisma.loan.delete({ where: { id: loan.id } });
    await prisma.item.delete({ where: { id: item.id } });
  });

  it('is idempotent — a second run keeps the original deletion timestamp', async () => {
    await createKlapiUser('gone');

    await sync([member('present')]);
    const first = await prisma.user.findUnique({ where: { email: at('gone') } });

    const second = await sync([member('present')]);

    expect(second.deactivated).toEqual([]);
    const after = await prisma.user.findUnique({ where: { email: at('gone') } });
    expect(after?.deletedAt?.getTime()).toBe(first?.deletedAt?.getTime());
  });
});

describe('syncWorkspaceUsers — restoring', () => {
  it('restores a member the sync itself had deactivated', async () => {
    await createKlapiUser('returned', { deletedAt: new Date(), deletedBySync: true });

    const result = await sync([member('returned')]);

    expect(result.restored).toEqual([at('returned')]);
    const user = await prisma.user.findUnique({ where: { email: at('returned') } });
    expect(user).toMatchObject({ deletedAt: null, deletedBySync: false });
  });

  it("does NOT resurrect someone an admin deleted by hand", async () => {
    await createKlapiUser('banned', { deletedAt: new Date(), deletedBySync: false });

    const result = await sync([member('banned')]);

    expect(result.restored).toEqual([]);
    expect(result.created).toEqual([]);
    const user = await prisma.user.findUnique({ where: { email: at('banned') } });
    expect(user?.deletedAt).toBeInstanceOf(Date);
  });
});

describe('syncWorkspaceUsers — scope', () => {
  it('ignores users outside the Workspace domain', async () => {
    const outsider = await prisma.user.create({
      data: {
        id: `${testPrefix}-gmail`,
        email: `${testPrefix}-outsider@gmail.com`,
        name: 'Personal Account',
        group: Group.USER,
      },
    });

    const result = await sync([member('present')]);

    expect(result.deactivated).toEqual([]);
    const after = await prisma.user.findUnique({ where: { id: outsider.id } });
    expect(after?.deletedAt).toBeNull();

    await prisma.user.delete({ where: { id: outsider.id } });
  });

  it('never provisions an excluded robot account, even when it is on the roster', async () => {
    const result = await sync([member('robot'), member('person')], {
      excludeEmails: [at('robot')],
    });

    expect(result.created).toEqual([at('person')]);
    expect(await prisma.user.findUnique({ where: { email: at('robot') } })).toBeNull();
  });

  it('never deactivates an excluded account that is off the roster', async () => {
    await createKlapiUser('robot', { group: Group.ADMIN });

    const result = await sync([member('person')], { excludeEmails: [at('robot')] });

    expect(result.deactivated).toEqual([]);
    expect(result.keptAlive).toEqual([]);
    const robot = await prisma.user.findUnique({ where: { email: at('robot') } });
    expect(robot?.deletedAt).toBeNull();
  });

  it('never deactivates a KIOSK terminal, even on the domain', async () => {
    await createKlapiUser('kiosk', { group: Group.KIOSK });

    const result = await sync([member('present')]);

    expect(result.deactivated).toEqual([]);
    const kiosk = await prisma.user.findUnique({ where: { email: at('kiosk') } });
    expect(kiosk?.deletedAt).toBeNull();
  });
});

describe('syncWorkspaceUsers — guards', () => {
  it('refuses to run on a roster with no active members', async () => {
    await createKlapiUser('everyone');

    await expect(sync([member('everyone', { active: false })])).rejects.toBeInstanceOf(
      UserSyncAbort,
    );

    const user = await prisma.user.findUnique({ where: { email: at('everyone') } });
    expect(user?.deletedAt).toBeNull();
  });

  it('aborts without writing when a run would deactivate too many at once', async () => {
    await createKlapiUser('a');
    await createKlapiUser('b');
    await createKlapiUser('c');

    await expect(
      sync([member('survivor'), member('newbie')], { maxDeactivations: 2 }),
    ).rejects.toBeInstanceOf(UserSyncAbort);

    // The additive half must not have run either — nothing was written.
    expect(await prisma.user.findUnique({ where: { email: at('newbie') } })).toBeNull();
    expect((await prisma.user.findUnique({ where: { email: at('a') } }))?.deletedAt).toBeNull();
  });

  it('keeps the last live ADMIN even when they leave the roster', async () => {
    await createKlapiUser('onlyadmin', { group: Group.ADMIN });

    const result = await sync([member('present')]);

    expect(result.keptAlive).toEqual([at('onlyadmin')]);
    expect(result.deactivated).toEqual([]);
    const admin = await prisma.user.findUnique({ where: { email: at('onlyadmin') } });
    expect(admin?.deletedAt).toBeNull();
  });

  it('does deactivate a departing admin while another admin remains', async () => {
    await createKlapiUser('admin1', { group: Group.ADMIN });
    await createKlapiUser('admin2', { group: Group.ADMIN });

    const result = await sync([member('admin2')]);

    expect(result.deactivated).toEqual([at('admin1')]);
  });
});

describe('syncWorkspaceUsers — dry run', () => {
  it('reports every change without writing any of them', async () => {
    await createKlapiUser('gone');
    await createKlapiUser('renameme', { name: 'Old' });
    await createKlapiUser('back', { deletedAt: new Date(), deletedBySync: true });

    const result = await sync(
      [member('newbie'), member('renameme', { name: 'New' }), member('back')],
      { dryRun: true },
    );

    expect(result).toMatchObject({
      dryRun: true,
      created: [at('newbie')],
      renamed: [at('renameme')],
      restored: [at('back')],
      deactivated: [at('gone')],
    });

    expect(await prisma.user.findUnique({ where: { email: at('newbie') } })).toBeNull();
    expect((await prisma.user.findUnique({ where: { email: at('gone') } }))?.deletedAt).toBeNull();
    expect((await prisma.user.findUnique({ where: { email: at('renameme') } }))?.name).toBe('Old');
    expect(
      (await prisma.user.findUnique({ where: { email: at('back') } }))?.deletedAt,
    ).toBeInstanceOf(Date);
  });
});
