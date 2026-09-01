import crypto from 'crypto';

// Symmetric encryption for the KIOSK user's displayable password, so a raw
// database dump alone does not yield a usable credential — you also need the
// app secret. This is a convenience feature, not a strong secret store: any
// admin can view the decrypted value in the admin panel by design.
//
// The key comes from KIOSK_SECRET_KEY, falling back to NEXTAUTH_SECRET.
//
// The fallback is what this code used to do outright, and it turned out to be
// a trap. NEXTAUTH_SECRET is a *session* secret: rotating it is a routine,
// expected operation — it is exactly what you do to invalidate every session,
// and what sharing sign-in across pitva.fi required. But it was also the key
// to ciphertext at rest, so rotating it silently made every stored kiosk
// password undecryptable, with no error until an admin opened the panel and
// got "Could not decrypt kiosk password". Ciphertext at rest outlives a
// session secret and must not share its lifecycle.
//
// Recovering an existing value therefore means setting KIOSK_SECRET_KEY to the
// NEXTAUTH_SECRET that encrypted it. Where that value is gone, the ciphertext
// is gone with it and an admin has to set the kiosk password once more.

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const secret = process.env.KIOSK_SECRET_KEY || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('KIOSK_SECRET_KEY (or NEXTAUTH_SECRET) is required to encrypt/decrypt the kiosk password');
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
