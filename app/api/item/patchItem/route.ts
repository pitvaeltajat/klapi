import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { diffItemFields, logItemHistory, type ItemFieldValue } from '@/utils/itemHistory';

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return NextResponse.json(
      { message: 'Sinulla ei ole oikeutta tähän toimintoon' },
      { status: 401 },
    );
  }

  const body = await request.json();
  const { id, field, value } = body as {
    id: string;
    field: 'name' | 'description' | 'amount' | 'locationId';
    value: string | number | null;
  };

  if (!id || !field) {
    return NextResponse.json({ message: 'Puuttuvat kentät' }, { status: 400 });
  }

  const allowedFields = ['name', 'description', 'amount', 'locationId'] as const;
  if (!allowedFields.includes(field)) {
    return NextResponse.json({ message: 'Ei sallittu kenttä' }, { status: 400 });
  }

  const data: Record<string, string | number | null> = { [field]: value };

  if (field === 'amount') {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 1) {
      return NextResponse.json({ message: 'Määrän tulee olla positiivinen kokonaisluku' }, { status: 400 });
    }
    data[field] = num;
  }

  // Snapshot the field being changed (resolving location ids to names) before
  // the update, so the history entry reads e.g. "Sijainti: Varasto A → B".
  const before = await prisma.item.findUnique({
    where: { id },
    include: { location: true },
  });

  const updated = await prisma.item.update({
    where: { id },
    data,
    include: { categories: true, location: true },
  });

  if (before) {
    const fieldKey = field === 'locationId' ? 'location' : field;
    const fromValue: ItemFieldValue =
      field === 'locationId' ? (before.location?.name ?? null) : before[field];
    const toValue: ItemFieldValue =
      field === 'locationId' ? (updated.location?.name ?? null) : (data[field] as ItemFieldValue);

    const changed = diffItemFields({ [fieldKey]: fromValue }, { [fieldKey]: toValue });
    if (Object.keys(changed).length > 0) {
      await logItemHistory({
        itemId: id,
        action: 'UPDATED',
        actedById: session.user.id,
        details: { changed },
      });
    }
  }

  return NextResponse.json(updated);
}
