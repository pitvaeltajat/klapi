import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { Category } from '@prisma/client';
import { diffItemFields, logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { badRequest, failed } from '@/utils/apiResponse';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();

    if (!body.id) return badRequest('Kaman tunniste puuttuu');

    const name = typeof body.name === 'string' ? body.name.trim() : body.name;
    if (!name) return badRequest('Nimi on pakollinen');

    // Snapshot before the edit so we can record a field-level diff.
    const before = await prisma.item.findUnique({
      where: { id: body.id },
      include: { categories: true },
    });
    if (!before) return badRequest('Kamaa ei löytynyt', 404);

    const categories: Category[] = body.categories ?? [];

    // edit the item in the database
    await prisma.item.update({
      where: {
        id: body.id,
      },
      data: {
        name,
        description: body.description,
        amount: body.amount,
        categories: {
          connectOrCreate: categories.map((category: Category) => ({
            create: { name: category.name },
            where: { id: category.id ? category.id : '' },
          })),
        },
      },
    });

    const changed = diffItemFields(
      {
        name: before.name,
        description: before.description,
        amount: before.amount,
        categories: before.categories.map((c) => c.name),
      },
      {
        name,
        description: body.description ?? null,
        amount: Number(body.amount),
        categories: categories.map((c) => c.name),
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

    return NextResponse.json({
      message: 'Item edited',
    });
  } catch (err) {
    return failed('Kaman päivitys epäonnistui', err, 'editItem');
  }
}
