import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const body = await request.json();

  // delete the item from the database
  await prisma.item.delete({
    where: {
      id: body,
    },
  });
  return NextResponse.json({
    message: 'Kama poistettu',
  });
}
