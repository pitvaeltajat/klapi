import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';

interface CategoryInput {
  value: string;
  label: string;
}

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();

    // destruct location and categories from the body to be used in connect queries
    const { ['locationId']: locationObject, ['categories']: categoriesList, ...rest } = body;

    // Trimmed: a trailing space is invisible in the UI but makes the name sort
    // oddly and breaks any lookup that matches on it exactly.
    const name = typeof rest.name === 'string' ? rest.name.trim() : rest.name;
    if (!name) {
      return NextResponse.json({ message: 'Nimi on pakollinen' }, { status: 400 });
    }

    // create new array with connectorcreate query for each category
    const categoryJSON = categoriesList?.map((categoryObject: CategoryInput) => ({
      where: {
        id: categoryObject.value,
      },
      create: {
        name: categoryObject.value,
      },
    }));
    const item = await prisma.item.create({
      data: {
        ...rest,
        name,
        // ensure type defaults to 'normal' when not provided by the client
        type: rest.type ?? 'normal',
        // Sijainti is optional. Spread the relation in only when one was picked —
        // `location: null` is not a valid nested write and Prisma rejects the
        // whole create, so a kama with no location used to 500.
        ...(locationObject
          ? {
              location: {
                connectOrCreate: {
                  where: {
                    id: locationObject.value,
                  },
                  create: {
                    name: locationObject.value,
                  },
                },
              },
            }
          : {}),
        // for each category, check if it exists and connect, if not, create it
        categories: { connectOrCreate: categoryJSON },
      },
    });

    await logItemHistory({
      itemId: item.id,
      action: 'CREATED',
      actedById: session.user.id,
      details: {
        name: item.name,
        amount: item.amount,
        location: locationObject?.label ?? null,
        categories: (categoriesList as CategoryInput[] | undefined)?.map((c) => c.label) ?? [],
      },
    });

    return NextResponse.json(item);
  } catch (err) {
    // This route is admin-only, so the underlying reason is worth showing:
    // "Virhe kaman luonnissa" alone told whoever hit it nothing, and the real
    // cause was only ever visible in the server log. Prisma's messages are a
    // multi-line diagram of the offending query with the actual complaint on
    // the last line — that line is the only part worth putting in a toast.
    console.error('createItem failed', err);
    const raw = err instanceof Error ? err.message : String(err);
    const detail = raw.split('\n').filter((line) => line.trim()).pop();
    return NextResponse.json({ message: 'Kaman luonti epäonnistui', detail }, { status: 500 });
  }
}
