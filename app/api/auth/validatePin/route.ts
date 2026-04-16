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
  const { pin, userId } = await request.json();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { kioskElevatePin: true },
  });

  if (!user || !user.kioskElevatePin) {
    return NextResponse.json({ isValidPin: false });
  }

  const isValidPin: boolean = await bcrypt.compare(pin, user.kioskElevatePin);

  return NextResponse.json({ isValidPin });
}
