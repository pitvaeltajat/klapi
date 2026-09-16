import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * Delete a kategoria. Unlike a sijainti this takes no kamat with it: the link
 * is many-to-many, so the kamat just lose the tag. The page says how many.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();
  const existing =
    typeof id === 'string' && id
      ? await prisma.category.findUnique({ where: { id }, select: { id: true } })
      : null;
  if (!existing) {
    return NextResponse.json({ message: 'Kategoriaa ei löytynyt' }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
