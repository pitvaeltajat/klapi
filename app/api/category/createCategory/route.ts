import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ message: 'Anna kategorialle nimi' }, { status: 400 });
  }
  // Names aren't unique in the schema, but two kategoriat with one name are two
  // filter chips that look identical — refuse it here, where it is typed.
  const clash = await prisma.category.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ message: `Kategoria "${name}" on jo olemassa` }, { status: 409 });
  }

  const category = await prisma.category.create({ data: { name } });
  return NextResponse.json(category);
}
