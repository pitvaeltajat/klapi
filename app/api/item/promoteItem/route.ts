import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { diffItemFields, logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const { id, name, description, amount, categories, locationId } = body as {
    id: string;
    name: string;
    description?: string | null;
    amount: number;
    categories: { id?: string; name: string }[];
    /** Sijainti in the same `{ value, label }` shape createItem/editItem take:
     *  `null` clears it, and an option the admin typed rather than picked
     *  carries its label as `value` and mints a new Location. */
    locationId?: { value: string; label: string } | null;
  };

  if (!id || !name || !amount) {
    return NextResponse.json({ message: 'Puuttuvat pakolliset kentät' }, { status: 400 });
  }

  const item = await prisma.item.findUnique({
    where: { id },
    include: { categories: true, location: true },
  });
  if (!item) {
    return NextResponse.json({ message: 'Kamaa ei löydy' }, { status: 404 });
  }
  if (item.type !== 'temporary') {
    return NextResponse.json({ message: 'Kama ei ole väliaikainen' }, { status: 400 });
  }

  const updated = await prisma.item.update({
    where: { id },
    data: {
      type: 'normal',
      name,
      description: description ?? null,
      amount,
      location: locationId
        ? {
            connectOrCreate: {
              where: { id: locationId.value },
              create: { name: locationId.value },
            },
          }
        : { disconnect: true },
      categories: {
        set: [],
        connectOrCreate: categories.map((cat) => ({
          create: { name: cat.name },
          where: { id: cat.id ?? '' },
        })),
      },
    },
    include: { categories: true, location: true },
  });

  console.log(
    `[promoteItem] Admin ${session.user.email ?? session.user.id} promoted item ${id} ("${item.name}" → "${name}") from temporary to normal`,
  );

  // Promotion is always meaningful (type temporary → normal), so log it even
  // when no other field changed; include any field diffs that did happen.
  const changed = diffItemFields(
    {
      name: item.name,
      description: item.description,
      amount: item.amount,
      location: item.location?.name ?? null,
      categories: item.categories.map((c) => c.name),
    },
    {
      name: updated.name,
      description: updated.description,
      amount: updated.amount,
      location: updated.location?.name ?? null,
      categories: updated.categories.map((c) => c.name),
    },
  );
  await logItemHistory({
    itemId: id,
    action: 'PROMOTED',
    actedById: session.user.id,
    details: Object.keys(changed).length > 0 ? { changed } : undefined,
  });

  return NextResponse.json(updated);
}
