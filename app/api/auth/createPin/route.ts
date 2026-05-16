import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

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

  await prisma.user.update({
    where: { id: session.user.id },
    data: { kioskElevatePin: await bcrypt.hash(pin, 10) },
  });

  return NextResponse.json({ message: 'Success' });
}
