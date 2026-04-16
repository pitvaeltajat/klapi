import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!(session?.user.group === 'ADMIN')) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { pin } = await request.json();

  if (!pin) {
    return NextResponse.json({ message: 'Bad Request' }, { status: 400 });
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ message: 'Invalid PIN format' }, { status: 400 });
  }

  await prisma.user.updateMany({
    where: { group: 'KIOSK' },
    data: {
      kioskElevatePin: await bcrypt.hash(pin, 10),
    },
  });

  return NextResponse.json({ message: 'Success' });
}
