import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    action: 'delete' | 'setCategory' | 'setLocation';
    ids: string[];
    categoryName?: string;
    locationName?: string;
  };

  if (!action || !ids || ids.length === 0) {
    return NextResponse.json({ message: 'Puuttuvat kentät' }, { status: 400 });
  }

  if (action === 'delete') {
    await prisma.item.deleteMany({ where: { id: { in: ids } } });
    return NextResponse.json({ message: `${ids.length} kamaa poistettu` });
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

    return NextResponse.json({ message: `Sijainti asetettu ${ids.length} kamalle`, location });
  }

  return NextResponse.json({ message: 'Tuntematon toiminto' }, { status: 400 });
}
