import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';
import { requireUser } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { group: true },
  });
  if (dbUser?.group !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Vain admin voi asettaa oman PIN-koodinsa. Kirjaudu sisään admin-tilillä.' },
      { status: 403 },
    );
  }

  const { pin } = await request.json();

  if (!pin) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ message: 'Invalid PIN format' }, { status: 400 });
  }

  // Note: duplicate PINs across admins are intentionally allowed. Rejecting them
  // would turn this endpoint into an oracle (with only a handful of admins and
  // 10 000 PINs, a rejection leaks another admin's PIN). Kiosk elevation is
  // name-scoped (verified against the *selected* admin only), so a shared PIN
  // never causes ambiguous attribution.

  await prisma.user.update({
    where: { id: session.user.id },
    data: { kioskElevatePin: await bcrypt.hash(pin, 10) },
  });

  return NextResponse.json({ message: 'Success' });
}
