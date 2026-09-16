import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';
import { withPaths } from '@/utils/locationTree';

/**
 * Every sijainti with its `path` ("Kalusto / Hylly 3") and `depth`, already in
 * tree order with Finnish collation — the pickers label options with the path,
 * `/admin/locations` indents by the depth.
 */
export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const locations = await prisma.location.findMany({
    include: {
      item: { select: { id: true, locationId: true } },
      _count: { select: { items: true, children: true } },
    },
  });
  return NextResponse.json(withPaths(locations));
}
