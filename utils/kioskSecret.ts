import crypto from 'crypto';

// Symmetric encryption for the KIOSK user's displayable password. The key is
// derived from NEXTAUTH_SECRET (already required for auth), so a raw database
// dump alone does not yield a usable credential — you also need the app secret.
// This is a convenience feature, not a strong secret store: any admin can view
// the decrypted value in the admin panel by design.

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required to encrypt/decrypt the kiosk password');
  }
  return crypto.createHash('sha256').update(secret).digest(); // 32 bytes
}

export function encryptKioskSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptKioskSecret(enc: string): string {
  const [ivB64, tagB64, ctB64] = enc.split(':');
  if (!ivB64 || !tagB64 || !ctB64) {
    throw new Error('Malformed encrypted kiosk password');
  }
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return decipher.update(Buffer.from(ctB64, 'base64'), undefined, 'utf8') + decipher.final('utf8');
}
