import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '@/utils/prisma';
import { encryptKioskSecret, decryptKioskSecret } from '@/utils/kioskSecret';
import { requireAdmin } from '@/utils/apiAuth';

// GET — reveal the current kiosk password to an admin. Returns null if none has
// been generated yet (the admin then POSTs to create one).
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const kioskUser = await prisma.user.findFirst({
    where: { group: 'KIOSK', kioskPasswordEnc: { not: null }, deletedAt: null },
    select: { kioskPasswordEnc: true },
  });

  if (!kioskUser?.kioskPasswordEnc) {
    return NextResponse.json({ kioskPassword: null });
  }

  try {
    return NextResponse.json({ kioskPassword: decryptKioskSecret(kioskUser.kioskPasswordEnc) });
  } catch (error) {
    // Ciphertext we cannot read — almost always because the key changed under
    // it (see utils/kioskSecret.ts). Report it as "no password", not as an
    // error, because the two are the same thing to an admin: there is no
    // usable credential here either way.
    //
    // The 500 this used to return was a dead end. The admin panel only offers
    // to generate a password when this route says there is none, so a failed
    // decrypt left the one control that could fix it unreachable — the button
    // raised a toast and nothing else, with no way out of the UI. Answering
    // null lets that same click mint a fresh password, which also rewrites the
    // bcrypt hash the kiosk actually logs in with.
    console.error('Failed to decrypt kiosk password; reporting as unset:', error);
    return NextResponse.json({ kioskPassword: null });
  }
}

// POST — rotate the kiosk password. Sets a new static (non-expiring) password on
// every KIOSK user: the bcrypt hash for auth plus an encrypted copy for display.
export async function POST() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const kioskUsers = await prisma.user.findMany({ where: { group: 'KIOSK', deletedAt: null }, select: { id: true } });
  if (kioskUsers.length === 0) {
    return NextResponse.json({ message: 'Kiosk user not found' }, { status: 404 });
  }

  const password = crypto.randomInt(100000, 999999).toString();
  await prisma.user.updateMany({
    where: { group: 'KIOSK', deletedAt: null },
    data: {
      password: await bcrypt.hash(password, 10),
      passwordExpiresAt: null, // static — no longer expires
      kioskPasswordEnc: encryptKioskSecret(password),
    },
  });

  return NextResponse.json({ kioskPassword: password });
}
