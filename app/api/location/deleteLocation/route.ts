import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

/**
 * Only an empty sijainti goes: `Item.locationId` cascades on delete, so one
 * with kamat in it would take them along. Its sub-sijainnit move up a level
 * into its own parent rather than falling to the top.
 */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const { id } = await request.json();
  const existing =
    typeof id === 'string' && id
      ? await prisma.location.findUnique({
          where: { id },
          select: { itemId: true, parentId: true, _count: { select: { items: true } } },
        })
      : null;
  if (!existing) {
    return NextResponse.json({ message: 'Sijaintia ei löytynyt' }, { status: 404 });
  }
  if (existing.itemId) {
    return NextResponse.json(
      { message: 'Sijainti on lainattava — poista lainattavuus ensin' },
      { status: 400 },
    );
  }
  if (existing._count.items > 0) {
    return NextResponse.json(
      { message: `Sijainnissa on vielä ${existing._count.items} kamaa — siirrä ne ensin` },
      { status: 409 },
    );
  }

  await prisma.$transaction([
    prisma.location.updateMany({ where: { parentId: id }, data: { parentId: existing.parentId } }),
    prisma.location.delete({ where: { id } }),
  ]);
  return NextResponse.json({ ok: true });
}
