import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Ei kirjautunut sisään' }, { status: 401 });
    }

    if (session?.user?.group !== 'ADMIN') {
      return NextResponse.json({ message: 'Ei oikeutta tähän toimintoon' }, { status: 403 });
    }

    const { id } = await request.json();

    const expiredAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        expiresAt: new Date(),
      },
    });

    return NextResponse.json({ expiredAnnouncement });
  } catch (error) {
    console.error('Virhe vanhennettaessa ilmoitusta:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
