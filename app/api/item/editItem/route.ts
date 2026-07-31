import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { Category } from '@prisma/client';
import { diffItemFields, logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';
import { badRequest, failed } from '@/utils/apiResponse';

/** What CreatableSelect hands back for a sijainti — `value` is the id, or the
 *  typed text when the option is brand new. */
interface LocationInput {
  value: string;
  label: string;
}

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
      include: { categories: true, location: true },
    });
    if (!before) return badRequest('Kamaa ei löytynyt', 404);

    // Sijainti, in the same `{ value, label }` shape createItem takes: an
    // absent key leaves it alone, `null` clears it, and an option the admin
    // typed instead of picked carries its label as `value` and mints a new
    // Location. `undefined` and `null` mean different things here, so this is
    // deliberately `in`-checked rather than truthiness-checked.
    const hasLocation = 'locationId' in body;
    const location = (body.locationId ?? null) as LocationInput | null;

    // When it is sent, the list is the whole desired set — an empty array means
    // "no kategoriat". A missing key means "leave them alone" instead: only
    // EditItemDialog calls this route today and it always sends the list, but
    // reading absent as "the user cleared them" would let a future partial
    // caller wipe kategoriat it never meant to touch.
    const categories: Category[] | null = Array.isArray(body.categories) ? body.categories : null;

    // `connectOrCreate` only ever adds — a deselected kategoria stayed attached
    // while the history log below happily recorded it as removed. Drop the ones
    // that are no longer in the list. A kategoria the user just typed carries
    // its own label as `id` (that is what CreatableSelect puts in `value`), so
    // it matches nothing in `before` and cannot keep anything alive by accident.
    // Disconnect and connectOrCreate touch disjoint sets, so their order does
    // not matter.
    const keptIds = new Set(categories?.map((category) => category.id));
    const removed = before.categories.filter((category) => !keptIds.has(category.id));

    // edit the item in the database
    const updated = await prisma.item.update({
      where: {
        id: body.id,
      },
      include: { location: true },
      data: {
        name,
        description: body.description,
        amount: body.amount,
        ...(hasLocation
          ? {
              location: location
                ? {
                    connectOrCreate: {
                      where: { id: location.value },
                      create: { name: location.value },
                    },
                  }
                : { disconnect: true },
            }
          : {}),
        categories: categories
          ? {
              disconnect: removed.map((category) => ({ id: category.id })),
              connectOrCreate: categories.map((category: Category) => ({
                create: { name: category.name },
                where: { id: category.id ? category.id : '' },
              })),
            }
          : undefined,
      },
    });

    const changed = diffItemFields(
      {
        name: before.name,
        description: before.description,
        amount: before.amount,
        location: before.location?.name ?? null,
        categories: before.categories.map((c) => c.name),
      },
      {
        name,
        description: body.description ?? null,
        amount: Number(body.amount),
        // Read back from the row rather than from `location.label`: a newly
        // minted Location is named after what was typed, so this is the only
        // value guaranteed to match what the kama now points at.
        location: updated.location?.name ?? null,
        categories: (categories ?? before.categories).map((c) => c.name),
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
