import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

  const updated = await prisma.item.update({
    where: { id },
    data,
    include: { categories: true, location: true },
  });

  return NextResponse.json(updated);
}
