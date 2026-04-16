import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import prisma from '@/utils/prisma';

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const kioskUsers = await prisma.user.findMany({
      where: {
        group: 'KIOSK',
      },
    });

    if (kioskUsers.length === 0) {
      return NextResponse.json({ message: 'Kiosk user not found' }, { status: 404 });
    }

    const OTP = crypto.randomInt(100000, 999999).toString();
    const hashedPassword = await bcrypt.hash(OTP, 10);

    await prisma.user.updateMany({
      where: {
        group: 'KIOSK',
      },
      data: {
        password: hashedPassword,
        passwordExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // Expires in 15 minutes
      },
    });

    return NextResponse.json({
      message: 'Kiosk password created',
      kioskPassword: OTP,
    });
  } catch (error) {
    console.error('Error creating kiosk password:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
