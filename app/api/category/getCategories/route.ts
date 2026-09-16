import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

// Sorted here rather than in the query: Postgres' collation puts ä/å/ö with
// a/o, Finnish puts them last. Every dropdown fed by this route wants the
// Finnish order.
const fiCollator = new Intl.Collator('fi');

export async function GET() {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  // `_count.items` (live kamat only) is for the Kategoriat page; the pickers
  // ignore it.
  const categories = await prisma.category.findMany({
    include: { _count: { select: { items: { where: { deletedAt: null } } } } },
  });
  categories.sort((a, b) => fiCollator.compare(a.name, b.name));
  return NextResponse.json(categories);
}
