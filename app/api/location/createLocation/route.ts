import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import { readParentId, refuseParent } from '@/utils/locationQueries';

export async function POST(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const body = await request.json();
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ message: 'Anna sijainnille nimi' }, { status: 400 });
  }
  const parentId = readParentId(body.parentId);
  const refused = await refuseParent(null, parentId);
  if (refused) return refused;

  const location = await prisma.location.create({ data: { name, parentId } });
  return NextResponse.json(location);
}
