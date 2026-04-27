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
  const { id, name, description, amount, categories, locationId } = body as {
    id: string;
    name: string;
    description?: string | null;
    amount: number;
    categories: { id?: string; name: string }[];
    locationId?: string | null;
  };

  if (!id || !name || !amount) {
    return NextResponse.json({ message: 'Puuttuvat pakolliset kentät' }, { status: 400 });
  }

  const item = await prisma.item.findUnique({ where: { id } });
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
      locationId: locationId ?? null,
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

  return NextResponse.json(updated);
}
