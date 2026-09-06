import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { inventoryQuery } from '@/utils/itemQueries';
import { requireAdmin } from '@/utils/apiAuth';

const PAGE_SIZE_MAX = 200;

/**
 * Paginated inventory listing for the admin editor. The `Item` table grows
 * without bound (every custom loan request leaves a permanent `temporary`
 * item behind), so this route filters, sorts, and pages server-side and never
 * returns more than one page of rows.
 *
 * The filters and ordering live in `inventoryQuery` (`utils/itemQueries.ts`),
 * shared with `item/exportInventory`; this route adds paging on top.
 *
 * Query params: those of `inventoryQuery`, plus
 *   page      1-based page number (default 1)
 *   pageSize  rows per page (default 50, capped at 200)
 */
export async function GET(request: Request) {
  const { denied } = await requireAdmin();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, Number(params.get('pageSize')) || 50),
  );

  const { where, orderBy } = inventoryQuery(params);

  const [items, total] = await prisma.$transaction([
    prisma.item.findMany({
      where,
      include: { categories: true, location: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.item.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}
