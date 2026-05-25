import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logItemHistory } from '@/utils/itemHistory';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Sinulla ei ole oikeutta tähän toimintoon' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { action, ids, categoryName, locationName } = body as {
    action: 'delete' | 'restore' | 'setCategory' | 'setLocation';
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
