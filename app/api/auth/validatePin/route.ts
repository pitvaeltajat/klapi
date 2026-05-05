import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { pin } = await request.json();

  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ isValidPin: false });
  }

  const admins = await prisma.user.findMany({
    where: { group: 'ADMIN', kioskElevatePin: { not: null } },
    select: { kioskElevatePin: true },
  });

  let isValidPin = false;
  for (const admin of admins) {
    if (admin.kioskElevatePin && (await bcrypt.compare(pin, admin.kioskElevatePin))) {
      isValidPin = true;
    }
  }

  return NextResponse.json({ isValidPin });
}
