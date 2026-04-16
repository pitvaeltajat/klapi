import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Category } from '@prisma/client';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const body = await request.json();

  // edit the item in the database
  await prisma.item.update({
    where: {
      id: body.id,
    },
    data: {
      name: body.name,
      description: body.description,
      amount: body.amount,
      categories: {
        connectOrCreate: body.categories.map((category: Category) => ({
          create: { name: category.name },
          where: { id: category.id ? category.id : '' },
        })),
      },
    },
  });
  return NextResponse.json({
    message: 'Item edited',
  });
}
