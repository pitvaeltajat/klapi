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

    if (session.user.group !== 'ADMIN') {
      return NextResponse.json({ message: 'Ei oikeutta tähän toimintoon' }, { status: 403 });
    }

    const { announcement } = await request.json();

    const createdAnnouncement = await prisma.announcement.create({
      data: {
        message: announcement.message,
        itemId: announcement.itemId,
      },
    });

    return NextResponse.json({ createdAnnouncement });
  } catch (error) {
    console.error('Virhe luotaessa ilmoitusta:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
