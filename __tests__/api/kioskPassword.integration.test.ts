/**
 * Integration test for the static kiosk password data path.
 * Requires a running PostgreSQL database (pnpm test starts one).
 *
 * Exercises exactly what the kioskPassword route does — store an encrypted +
 * bcrypt-hashed static password on the KIOSK user, then reveal it — against the
 * real DB column, so it catches schema/client/crypto mismatches.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import { encryptKioskSecret, decryptKioskSecret } from '@/utils/kioskSecret';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const KIOSK_ID = `test-kiosk-${Date.now()}`;

beforeAll(async () => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-kiosk-password-encryption';
  await prisma.user.create({ data: { id: KIOSK_ID, name: 'Test Kiosk', group: Group.KIOSK } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: KIOSK_ID } });
  await prisma.$disconnect();
});

describe('kiosk static password data path', () => {
  it('stores an encrypted + hashed password that is revealable, login-able, and non-expiring', async () => {
    const password = '482913';

    // POST: rotate — store hash for auth, encrypted copy for display, no expiry.
    await prisma.user.update({
      where: { id: KIOSK_ID },
      data: {
        password: await bcrypt.hash(password, 10),
        passwordExpiresAt: null,
        kioskPasswordEnc: encryptKioskSecret(password),
      },
    });

    // GET: reveal — the stored ciphertext decrypts back to the password.
    const row = await prisma.user.findFirst({
      where: { group: Group.KIOSK, id: KIOSK_ID, kioskPasswordEnc: { not: null } },
      select: { password: true, passwordExpiresAt: true, kioskPasswordEnc: true },
    });
    expect(row?.kioskPasswordEnc).toBeTruthy();
    expect(row!.kioskPasswordEnc).not.toContain(password); // not stored in the clear
    expect(decryptKioskSecret(row!.kioskPasswordEnc!)).toBe(password);

    // Login still works via the bcrypt hash, and the password does not expire.
    expect(await bcrypt.compare(password, row!.password!)).toBe(true);
    expect(row!.passwordExpiresAt).toBeNull();
  });
});
