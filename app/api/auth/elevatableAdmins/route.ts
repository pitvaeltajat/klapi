import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Lists admins who can be elevated to at the kiosk (i.e. have a PIN set), so the
// kiosk elevation dialog can name-scope the PIN check. Gated to KIOSK/ADMIN —
// this is the only place admin identities are surfaced to the kiosk, and it
// exposes id + name only (never the PIN hash).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const admins = await prisma.user.findMany({
    where: { group: 'ADMIN', kioskElevatePin: { not: null }, deletedAt: null },
    select: { id: true, name: true },
  });

  return NextResponse.json(admins);
}
