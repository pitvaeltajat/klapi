/**
 * Integration tests for `POST /api/item/uploadImage`.
 *
 * The route hands out a presigned S3 upload, so what matters is *who* gets one
 * and *for which key*. A plain loaner may fill in a kama's missing photo — but
 * only for a kama that exists, and only while it has no picture; everything
 * else stays with an admin.
 *
 * S3 is stubbed (nothing is signed for real) and the "does this kama already
 * have a photo?" probe is a HEAD against the public bucket, so `fetch` is
 * stubbed too.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

process.env.NEXT_PUBLIC_AWS_ITEM_PHOTOS_URL = 'https://bucket.test';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `uploadimage-test-${Date.now()}`;

const caller: { id: string; group: Group } = { id: '', group: Group.USER };

vi.mock('@/utils/apiAuth', () => ({
  requireUser: async () => ({ session: { user: caller }, denied: null }),
}));

vi.mock('@aws-sdk/client-s3', () => ({ S3Client: class {} }));

vi.mock('@aws-sdk/s3-presigned-post', () => ({
  createPresignedPost: vi.fn(async (_client: unknown, { Key }: { Key: string }) => ({
    url: 'https://bucket.test',
    fields: { key: Key },
  })),
}));

/** Keys the stubbed bucket answers 200 to — i.e. photos that already exist. */
const stored = new Set<string>();
const fetchMock = vi.fn(async (url: string | URL) => ({
  ok: stored.has(String(url)),
}));
vi.stubGlobal('fetch', fetchMock);

const { POST } = await import('@/app/api/item/uploadImage/route');

const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/item/uploadImage', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  );

let itemId: string;

describe('uploadImage — who may add a kama photo', () => {
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { id: `${prefix}-user`, email: `${prefix}-user@test.com`, group: Group.USER },
    });
    caller.id = user.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Test Item', amount: 1 },
    });
    itemId = item.id;
  });

  beforeEach(() => {
    caller.group = Group.USER;
    stored.clear();
    fetchMock.mockClear();
  });

  afterAll(async () => {
    await prisma.item.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  });

  it('lets a loaner add the missing photo of a real kama', async () => {
    const response = await post({ filename: itemId, contentType: 'image/jpeg' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ fields: { key: itemId } });
  });

  it('refuses to let a loaner replace a photo that already exists', async () => {
    stored.add(`https://bucket.test/original/${itemId}`);
    const response = await post({ filename: itemId, contentType: 'image/jpeg' });
    expect(response.status).toBe(403);
  });

  it('counts the compressed rendition and the raw upload as an existing photo', async () => {
    stored.add(`https://bucket.test/compressed/${itemId}`);
    expect((await post({ filename: itemId, contentType: 'image/jpeg' })).status).toBe(403);

    stored.clear();
    stored.add(`https://bucket.test/${itemId}`);
    expect((await post({ filename: itemId, contentType: 'image/jpeg' })).status).toBe(403);
  });

  it('refuses a key that is not a kama, so a rendition cannot be poisoned', async () => {
    const response = await post({ filename: `compressed/${itemId}`, contentType: 'image/jpeg' });
    expect(response.status).toBe(404);
  });

  it('refuses a non-image', async () => {
    const response = await post({ filename: itemId, contentType: 'application/pdf' });
    expect(response.status).toBe(400);
  });

  it('refuses the kiosk terminal', async () => {
    caller.group = Group.KIOSK;
    const response = await post({ filename: itemId, contentType: 'image/jpeg' });
    expect(response.status).toBe(401);
  });

  it('signs an oma kama upload without touching the catalogue', async () => {
    const key = 'custom-3f1a2b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';
    const response = await post({ filename: key, contentType: 'image/jpeg' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ fields: { key } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still lets an admin replace an existing photo', async () => {
    caller.group = Group.ADMIN;
    stored.add(`https://bucket.test/original/${itemId}`);
    const response = await post({ filename: itemId, contentType: 'image/jpeg' });
    expect(response.status).toBe(200);
  });
});
