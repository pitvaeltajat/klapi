import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        group: {
          not: 'KIOSK',
        },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
      orderBy: {
        email: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
