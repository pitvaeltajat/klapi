import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '@/utils/prisma';
import { encryptKioskSecret, decryptKioskSecret } from '@/utils/kioskSecret';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') return null;
  return session;
}

// GET — reveal the current kiosk password to an admin. Returns null if none has
// been generated yet (the admin then POSTs to create one).
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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
    console.error('Failed to decrypt kiosk password:', error);
    return NextResponse.json({ message: 'Could not decrypt kiosk password' }, { status: 500 });
  }
}

// POST — rotate the kiosk password. Sets a new static (non-expiring) password on
// every KIOSK user: the bcrypt hash for auth plus an encrypted copy for display.
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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
