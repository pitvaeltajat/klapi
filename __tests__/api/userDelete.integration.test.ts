/**
 * Integration tests for `DELETE /api/user/[userId]` — an admin removing a
 * member. It is a soft delete: the row and everything hanging off it (loans,
 * history) stay, and `deletedBySync: false` tells the nightly Workspace sync
 * that a human made this call, so the sync must not undo it.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { NextResponse } from 'next/server';
import { PrismaClient, Group, LoanStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `userdelete-test-${Date.now()}`;

let actor: { id: string; group: Group };
vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    actor.group === Group.ADMIN
      ? { session: { user: actor }, denied: null }
      : { session: null, denied: NextResponse.json({ message: 'Ei oikeutta' }, { status: 403 }) },
}));

const { DELETE } = await import('@/app/api/user/[userId]/route');

const remove = (userId: string) =>
  DELETE(new Request(`http://localhost/api/user/${userId}`, { method: 'DELETE' }), {
    params: Promise.resolve({ userId }),
  });

let adminId: string;
let memberId: string;

beforeAll(async () => {
  adminId = (
    await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    })
  ).id;
});

beforeEach(async () => {
  actor = { id: adminId, group: Group.ADMIN };
  await prisma.user.deleteMany({ where: { id: `${prefix}-member` } });
  memberId = (
    await prisma.user.create({
      data: {
        id: `${prefix}-member`,
        email: `${prefix}-member@test.com`,
        group: Group.USER,
        // As if the sync had removed and an admin is now confirming it.
        deletedBySync: true,
        loans: {
          create: {
            startTime: new Date('2027-06-01T09:00:00Z'),
            endTime: new Date('2027-06-02T09:00:00Z'),
            status: LoanStatus.RETURNED,
          },
        },
      },
    })
  ).id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: [adminId, memberId] } } });
  await prisma.$disconnect();
});

describe('DELETE user/[userId]', () => {
  it('soft-deletes as a human decision and keeps the member’s loans', async () => {
    expect((await remove(memberId)).status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: memberId },
      include: { loans: true },
    });
    expect(after.deletedAt).not.toBeNull();
    expect(after.deletedBySync).toBe(false);
    expect(after.loans).toHaveLength(1);
  });

  it('answers a repeat delete with the row as it stands, original timestamp kept', async () => {
    await remove(memberId);
    const first = (await prisma.user.findUniqueOrThrow({ where: { id: memberId } })).deletedAt;

    const response = await remove(memberId);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { id: string; deletedAt: string };
    expect(body.id).toBe(memberId);
    expect(new Date(body.deletedAt)).toEqual(first);
    const second = (await prisma.user.findUniqueOrThrow({ where: { id: memberId } })).deletedAt;
    expect(second).toEqual(first);
  });

  it('answers 404 for a user that does not exist', async () => {
    expect((await remove(`${prefix}-nobody`)).status).toBe(404);
  });

  it('is admin-only', async () => {
    actor = { id: 'someone', group: Group.USER };

    expect((await remove(memberId)).status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: memberId } })).deletedAt).toBeNull();
  });
});
