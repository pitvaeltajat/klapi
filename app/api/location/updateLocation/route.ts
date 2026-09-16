import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import { readParentId, refuseParent } from '@/utils/locationQueries';
import { syncLoanableItem } from '@/utils/containers';

/** Rename a sijainti and/or move it under another one (`parentId: null` = top level). */
export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const id = typeof body.id === 'string' ? body.id : '';
  const existing = id
    ? await prisma.location.findUnique({ where: { id }, select: { id: true } })
    : null;
  if (!existing) {
    return NextResponse.json({ message: 'Sijaintia ei löytynyt' }, { status: 404 });
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
  // A lainattava sijainti's kama carries the same name and place.
  await syncLoanableItem(id);
  return NextResponse.json(location);
}
