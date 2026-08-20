/**
 * Integration tests for folding a duplicate account into a primary one
 * (utils/mergeUsers).
 *
 * The thing under test is that *nothing is lost*: every row that pointed at the
 * duplicate points at the primary afterwards, and the merge is all-or-nothing.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { PrismaClient, Group, LoanStatus, EmailType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { mergeUsers, MergeUsersError } from '@/utils/mergeUsers';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `merge-${Date.now()}`;
let itemId: string;

async function createUser(tag: string, group: Group = Group.USER) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-${tag}-${Math.random()}`,
      email: `${testPrefix}-${tag}-${Math.random()}@test.example`,
      name: `User ${tag}`,
      group,
    },
  });
}

/** A loan owned by `userId`, plus an email log and a history entry it acted on. */
async function createLoanWithTrail(userId: string) {
  const loan = await prisma.loan.create({
    data: {
      id: `${testPrefix}-loan-${Math.random()}`,
      userId,
      status: LoanStatus.ACCEPTED,
      startTime: new Date(),
      endTime: new Date(Date.now() + 86_400_000),
      description: 'Merge test',
      reservations: { create: [{ amount: 1, itemId }] },
    },
  });
  await prisma.emailLog.create({
    data: { loanId: loan.id, userId, emailType: EmailType.PICKUP_REMINDER },
  });
  await prisma.loanHistory.create({
    data: { loanId: loan.id, action: 'CREATED', actedById: userId },
  });
  await prisma.itemHistory.create({
    data: { itemId, action: 'UPDATED', actedById: userId },
  });
  return loan;
}

async function cleanUp() {
  await prisma.emailLog.deleteMany({ where: { loan: { id: { startsWith: testPrefix } } } });
  await prisma.loan.deleteMany({ where: { id: { startsWith: testPrefix } } });
  await prisma.itemHistory.deleteMany({ where: { itemId } });
  await prisma.user.deleteMany({ where: { id: { startsWith: testPrefix } } });
}

beforeAll(async () => {
  const item = await prisma.item.create({
    data: { id: `${testPrefix}-item`, name: 'Rinkka', amount: 5 },
  });
  itemId = item.id;
});

beforeEach(cleanUp);

afterAll(async () => {
  await cleanUp();
  await prisma.item.delete({ where: { id: itemId } });
  await prisma.$disconnect();
});

describe('mergeUsers', () => {
  it('moves every loan, email log and history entry onto the primary', async () => {
    const primary = await createUser('primary');
    const duplicate = await createUser('dup');
    await createLoanWithTrail(duplicate.id);
    await createLoanWithTrail(duplicate.id);
    await createLoanWithTrail(primary.id);

    const result = await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

    expect(result.moved).toMatchObject({
      loans: 2,
      emailLogs: 2,
      loanHistory: 2,
      itemHistory: 2,
    });

    // The primary now owns everything; the duplicate owns nothing.
    expect(await prisma.loan.count({ where: { userId: primary.id } })).toBe(3);
    expect(await prisma.loan.count({ where: { userId: duplicate.id } })).toBe(0);
    expect(await prisma.emailLog.count({ where: { userId: primary.id } })).toBe(3);
    expect(await prisma.loanHistory.count({ where: { actedById: primary.id } })).toBe(3);
    expect(await prisma.itemHistory.count({ where: { actedById: primary.id } })).toBe(3);
  });

  it('soft-deletes the duplicate and records where its data went', async () => {
    const primary = await createUser('primary');
    const duplicate = await createUser('dup');

    await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

    const after = await prisma.user.findUnique({ where: { id: duplicate.id } });
    expect(after?.deletedAt).toBeInstanceOf(Date);
    expect(after?.mergedIntoId).toBe(primary.id);
    // A person decided this, so the Workspace sync must never undo it.
    expect(after?.deletedBySync).toBe(false);
    // The row survives, so its email stays claimed and auth refuses that login.
    expect(after?.email).toBeTruthy();
  });

  it('keeps the primary live and reachable', async () => {
    const primary = await createUser('primary');
    const duplicate = await createUser('dup');

    await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

    const after = await prisma.user.findUnique({ where: { id: primary.id } });
    expect(after?.deletedAt).toBeNull();
    expect(after?.mergedIntoId).toBeNull();
  });

  it('raises the primary when the duplicate was the admin of the two', async () => {
    const primary = await createUser('primary', Group.USER);
    const duplicate = await createUser('dup', Group.ADMIN);

    const result = await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

    expect(result.promotedTo).toBe(Group.ADMIN);
    expect((await prisma.user.findUnique({ where: { id: primary.id } }))?.group).toBe(Group.ADMIN);
  });

  it('never demotes an admin primary', async () => {
    const primary = await createUser('primary', Group.ADMIN);
    const duplicate = await createUser('dup', Group.USER);

    const result = await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

    expect(result.promotedTo).toBeNull();
    expect((await prisma.user.findUnique({ where: { id: primary.id } }))?.group).toBe(Group.ADMIN);
  });

  describe('dry run', () => {
    it('reports the counts without moving anything', async () => {
      const primary = await createUser('primary');
      const duplicate = await createUser('dup');
      await createLoanWithTrail(duplicate.id);

      const result = await mergeUsers(
        { primaryId: primary.id, duplicateId: duplicate.id },
        { dryRun: true },
      );

      expect(result).toMatchObject({ dryRun: true, moved: { loans: 1, emailLogs: 1 } });
      expect(await prisma.loan.count({ where: { userId: duplicate.id } })).toBe(1);
      expect(await prisma.loan.count({ where: { userId: primary.id } })).toBe(0);
      expect((await prisma.user.findUnique({ where: { id: duplicate.id } }))?.deletedAt).toBeNull();
    });
  });

  describe('guards', () => {
    it('refuses to merge a user into themselves', async () => {
      const user = await createUser('solo');
      await expect(
        mergeUsers({ primaryId: user.id, duplicateId: user.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
    });

    it('refuses a KIOSK terminal on either side', async () => {
      const person = await createUser('person');
      const kiosk = await createUser('kiosk', Group.KIOSK);

      await expect(
        mergeUsers({ primaryId: person.id, duplicateId: kiosk.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
      await expect(
        mergeUsers({ primaryId: kiosk.id, duplicateId: person.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
    });

    it('refuses a deleted primary — data would land on an unreachable account', async () => {
      const primary = await createUser('primary');
      const duplicate = await createUser('dup');
      await prisma.user.update({ where: { id: primary.id }, data: { deletedAt: new Date() } });

      await expect(
        mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
    });

    it('refuses an already-merged duplicate, so a re-run is a no-op', async () => {
      const primary = await createUser('primary');
      const duplicate = await createUser('dup');
      await mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id });

      await expect(
        mergeUsers({ primaryId: primary.id, duplicateId: duplicate.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
    });

    it('refuses a primary that does not exist', async () => {
      const duplicate = await createUser('dup');
      await expect(
        mergeUsers({ primaryId: `${testPrefix}-nope`, duplicateId: duplicate.id }),
      ).rejects.toBeInstanceOf(MergeUsersError);
    });
  });
});
