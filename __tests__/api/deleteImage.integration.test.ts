/**
 * Integration tests for `POST /api/item/deleteImage`.
 *
 * Removing a photo without putting another in its place is an admin job, and it
 * has to take *all three* keys with it — the raw upload plus the `original/`
 * and `compressed/` renditions — or the old picture keeps showing on the cards.
 *
 * S3 is stubbed: what matters is who gets through and which keys are asked for.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `deleteimage-test-${Date.now()}`;

/** Flipped per test: `denied` stands in for every non-admin caller. */
let adminId: string | null = null;

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    adminId
      ? { session: { user: { id: adminId, group: Group.ADMIN } }, denied: null }
      : {
          session: null,
          denied: Response.json({ message: 'Sinulla ei ole oikeutta tähän toimintoon' }, { status: 401 }),
        },
}));

type DeleteCall = { input: { Delete: { Objects: { Key: string }[] } } };

/** Echoes the real DeleteObjectsCommand response shape back at the route. */
const send = vi.fn(async (command: DeleteCall) => ({ Deleted: command.input.Delete.Objects }));
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = send;
  },
  DeleteObjectsCommand: class {
    constructor(public input: { Delete: { Objects: { Key: string }[] } }) {}
  },
}));

const { POST } = await import('@/app/api/item/deleteImage/route');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/item/deleteImage', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

/** The keys the route asked S3 to drop on its last call. */
const deletedKeys = (): string[] =>
  send.mock.calls.at(-1)![0].input.Delete.Objects.map((o) => o.Key);

let itemId: string;

describe('deleteImage — throwing away a kama photo', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = user.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Test Item', amount: 1 },
    });
    itemId = item.id;
  });

  beforeEach(() => {
    adminId = `${prefix}-admin`;
    send.mockClear();
  });

  afterAll(async () => {
    await prisma.itemHistory.deleteMany({ where: { itemId: { startsWith: prefix } } });
    await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('drops the upload and both renditions', async () => {
    const response = await post({ itemId });
    expect(response.status).toBe(200);
    expect(deletedKeys()).toEqual([itemId, `original/${itemId}`, `compressed/${itemId}`]);
  });

  it('records the removal in the kama history', async () => {
    await post({ itemId });
    const entry = await prisma.itemHistory.findFirst({
      where: { itemId, action: 'UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(entry?.details).toMatchObject({ note: 'Kuva poistettu' });
  });

  it('refuses anyone who is not an admin', async () => {
    adminId = null;
    const response = await post({ itemId });
    expect(response.status).toBe(401);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses a key that is not a kama, so no other object can be deleted', async () => {
    const response = await post({ itemId: `original/${itemId}` });
    expect(response.status).toBe(404);
    expect(send).not.toHaveBeenCalled();
  });

  it('clears an oma kama photo whose row does not exist yet', async () => {
    const customId = `custom-${crypto.randomUUID()}`;
    const response = await post({ itemId: customId });
    expect(response.status).toBe(200);
    expect(deletedKeys()).toEqual([customId, `original/${customId}`, `compressed/${customId}`]);
  });
});
