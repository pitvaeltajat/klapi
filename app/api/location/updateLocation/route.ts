import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import { readParentId, refuseParent } from '@/utils/locationQueries';

/** Rename a sijainti and/or move it under another one (`parentId: null` = top level). */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  const existing = id
    ? await prisma.location.findUnique({ where: { id }, select: { itemId: true } })
    : null;
  if (!existing) {
    return NextResponse.json({ message: 'Sijaintia ei löytynyt' }, { status: 404 });
  }
  // Its name is the kama's name and its place is where the kama is stored —
  // both are changed on the kama, which keeps the pair in step.
  if (existing.itemId) {
    return NextResponse.json(
      { message: 'Säilytyspaikkaa muokataan sen kaman kautta' },
      { status: 400 },
    );
  }

  const data: { name?: string; parentId?: string | null } = {};
  if ('name' in body) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ message: 'Anna sijainnille nimi' }, { status: 400 });
    data.name = name;
  }
  if ('parentId' in body) {
    data.parentId = readParentId(body.parentId);
    const refused = await refuseParent(id, data.parentId);
    if (refused) return refused;
  }

  const location = await prisma.location.update({ where: { id }, data });
  return NextResponse.json(location);
}
