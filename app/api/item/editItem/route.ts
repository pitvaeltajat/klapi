import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Category } from '@prisma/client';
import { diffItemFields, logItemHistory } from '@/utils/itemHistory';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json({
      message: 'Sinulla ei ole oikeutta tähän toimintoon',
    }, { status: 401 });
  }

  const body = await request.json();

  // Snapshot before the edit so we can record a field-level diff.
  const before = await prisma.item.findUnique({
    where: { id: body.id },
    include: { categories: true },
  });

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

  if (before) {
    const changed = diffItemFields(
      {
        name: before.name,
        description: before.description,
        amount: before.amount,
        categories: before.categories.map((c) => c.name),
      },
      {
        name: body.name,
        description: body.description ?? null,
        amount: Number(body.amount),
        categories: (body.categories as Category[]).map((c) => c.name),
      },
    );
    if (Object.keys(changed).length > 0) {
      await logItemHistory({
        itemId: body.id,
        action: 'UPDATED',
        actedById: session.user.id,
        details: { changed },
      });
    }
  }

  return NextResponse.json({
    message: 'Item edited',
  });
}
