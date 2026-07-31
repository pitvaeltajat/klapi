import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/** Unpublish a huomio: it stops showing to loaners but stays in the history. */
export async function POST(request: Request) {
  try {
    const { denied } = await requireAdmin();
    if (denied) return denied;

    const { id } = await request.json();

    const expiredAnnouncement = await prisma.announcement.update({
      where: { id },
      data: {
        expiresAt: new Date(),
      },
    });

    return NextResponse.json({ expiredAnnouncement });
  } catch (error) {
    console.error('Virhe poistettaessa huomiota:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
