import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { logItemHistory } from '@/utils/itemHistory';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { session, denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const { action, ids, categoryName, locationName } = body as {
    action: 'delete' | 'restore' | 'promote' | 'setCategory' | 'setLocation';
    ids: string[];
    categoryName?: string;
    locationName?: string;
  };

  if (!action || !ids || ids.length === 0) {
    return NextResponse.json({ message: 'Puuttuvat kentät' }, { status: 400 });
  }

  const actedById = session.user.id;

  if (action === 'delete') {
    // Read current state first so we only log items that actually transition.
    const affected = await prisma.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, deletedAt: true },
    });
    // Soft-delete: stamp deletedAt so reservations + loan history stay intact.
    await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
    await Promise.all(
      affected
        .filter((i) => !i.deletedAt)
        .map((i) =>
          logItemHistory({
            itemId: i.id,
            action: 'ARCHIVED',
            actedById,
            details: { name: i.name, bulk: true },
          }),
        ),
    );
    return NextResponse.json({ message: `${ids.length} kamaa arkistoitu` });
  }

  if (action === 'restore') {
    const affected = await prisma.item.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, deletedAt: true },
    });
    await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });
    await Promise.all(
      affected
        .filter((i) => i.deletedAt)
        .map((i) =>
          logItemHistory({
            itemId: i.id,
            action: 'RESTORED',
            actedById,
            details: { name: i.name, bulk: true },
          }),
        ),
    );
    return NextResponse.json({ message: `${ids.length} kamaa palautettu` });
  }

  // Bulk "siirrä kirjastoon" only flips the type. The single-item flow
  // (promoteItem) doubles as an edit form — nimi, määrä, kategoriat — which is
  // exactly what you don't want to fill in twenty times; the fields stay
  // editable in the table afterwards.
  if (action === 'promote') {
    const affected = await prisma.item.findMany({
      where: { id: { in: ids }, type: 'temporary' },
      select: { id: true, name: true },
    });
    if (affected.length === 0) {
      return NextResponse.json({ message: 'Ei väliaikaisia kamoja valittuna' }, { status: 400 });
    }
    await prisma.item.updateMany({
      where: { id: { in: affected.map((i) => i.id) } },
      data: { type: 'normal' },
    });
    await Promise.all(
      affected.map((i) =>
        logItemHistory({
          itemId: i.id,
          action: 'PROMOTED',
          actedById,
          details: { name: i.name, bulk: true },
        }),
      ),
    );
    return NextResponse.json({ message: `${affected.length} kamaa siirretty kirjastoon` });
  }

  if (action === 'setCategory') {
    if (!categoryName) {
      return NextResponse.json({ message: 'Kategoria puuttuu' }, { status: 400 });
    }

    const category = await prisma.category.upsert({
      where: { id: categoryName },
      create: { name: categoryName },
      update: {},
    });

    await Promise.all(
      ids.map((id) =>
        prisma.item.update({
          where: { id },
          data: { categories: { connect: { id: category.id } } },
        }),
      ),
    );
    await Promise.all(
      ids.map((id) =>
        logItemHistory({
          itemId: id,
          action: 'UPDATED',
          actedById,
          details: { note: `Lisätty kategoria: ${category.name}`, bulk: true },
        }),
      ),
    );

    return NextResponse.json({ message: `Kategoria asetettu ${ids.length} kamalle`, category });
  }

  if (action === 'setLocation') {
    if (!locationName) {
      return NextResponse.json({ message: 'Sijainti puuttuu' }, { status: 400 });
    }

    const location = await prisma.location.upsert({
      where: { id: locationName },
      create: { name: locationName },
      update: {},
    });

    await prisma.item.updateMany({
      where: { id: { in: ids } },
      data: { locationId: location.id },
    });
    await Promise.all(
      ids.map((id) =>
        logItemHistory({
          itemId: id,
          action: 'UPDATED',
          actedById,
          details: { note: `Sijainti asetettu: ${location.name}`, bulk: true },
        }),
      ),
    );

    return NextResponse.json({ message: `Sijainti asetettu ${ids.length} kamalle`, location });
  }

  return NextResponse.json({ message: 'Tuntematon toiminto' }, { status: 400 });
}
