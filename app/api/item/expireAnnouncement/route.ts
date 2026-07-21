import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireUser } from '@/utils/apiAuth';

export async function POST(request: Request) {
  try {
    const { session, denied } = await requireUser();
    if (denied) return denied;

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
