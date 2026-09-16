import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/** Rename a kategoria. Every kama in it follows, since they link by id. */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ message: 'Anna kategorialle nimi' }, { status: 400 });
  }
  const existing = id ? await prisma.category.findUnique({ where: { id }, select: { id: true } }) : null;
  if (!existing) {
    return NextResponse.json({ message: 'Kategoriaa ei löytynyt' }, { status: 404 });
  }
  const clash = await prisma.category.findFirst({
    where: { id: { not: id }, name: { equals: name, mode: 'insensitive' } },
    select: { id: true },
  });
  if (clash) {
    return NextResponse.json({ message: `Kategoria "${name}" on jo olemassa` }, { status: 409 });
  }

  const category = await prisma.category.update({ where: { id }, data: { name } });
  return NextResponse.json(category);
}
