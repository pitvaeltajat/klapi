import { describe, it, expect, beforeAll } from 'vitest';
import { encryptKioskSecret, decryptKioskSecret } from '@/utils/kioskSecret';

beforeAll(() => {
  process.env.NEXTAUTH_SECRET = 'test-secret-for-kiosk-password-encryption';
});

describe('kioskSecret encrypt/decrypt', () => {
  it('round-trips a password', () => {
    const enc = encryptKioskSecret('482913');
    expect(enc).not.toContain('482913'); // not stored in the clear
    expect(decryptKioskSecret(enc)).toBe('482913');
  });

  it('produces a different ciphertext each time (random IV)', () => {
    expect(encryptKioskSecret('482913')).not.toBe(encryptKioskSecret('482913'));
  });

  it('rejects a tampered ciphertext (GCM auth tag)', () => {
    const [iv, tag, ct] = encryptKioskSecret('482913').split(':');
    const flipped = Buffer.from(ct, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decryptKioskSecret([iv, tag, flipped.toString('base64')].join(':'))).toThrow();
  });

  it('fails to decrypt under a different secret', () => {
    const enc = encryptKioskSecret('482913');
    process.env.NEXTAUTH_SECRET = 'a-different-secret';
    expect(() => decryptKioskSecret(enc)).toThrow();
    process.env.NEXTAUTH_SECRET = 'test-secret-for-kiosk-password-encryption';
  });
});
