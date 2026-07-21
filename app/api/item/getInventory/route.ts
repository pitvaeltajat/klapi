import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/utils/prisma';
import { requireAdmin } from '@/utils/apiAuth';

const PAGE_SIZE_MAX = 200;

/**
 * Paginated inventory listing for the admin editor. The `Item` table grows
 * without bound (every custom loan request leaves a permanent `temporary`
 * item behind), so this route filters, sorts, and pages server-side and never
 * returns more than one page of rows.
 *
 * Query params:
 *   page      1-based page number (default 1)
 *   pageSize  rows per page (default 50, capped at 200)
 *   search    case-insensitive match on name/description
 *   type      'normal' | 'temporary' (omitted = both)
 *   category  category id to filter by
 *   archived  'all' to include soft-archived items (default: active only)
 *   sort      column id: name | description | amount | type | location
 *   dir       'asc' | 'desc' (default asc)
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
  const search = params.get('search')?.trim() ?? '';
  const typeParam = params.get('type');
  const category = params.get('category')?.trim() ?? '';
  const includeArchived = params.get('archived') === 'all';
  const sortDir: Prisma.SortOrder = params.get('dir') === 'desc' ? 'desc' : 'asc';
  const sortId = params.get('sort') ?? 'name';

  const where: Prisma.ItemWhereInput = {
    ...(includeArchived ? {} : { deletedAt: null }),
    ...(typeParam === 'normal' || typeParam === 'temporary'
      ? { type: typeParam }
      : {}),
    ...(category ? { categories: { some: { id: category } } } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const primarySort: Prisma.ItemOrderByWithRelationInput =
    sortId === 'location'
      ? { location: { name: sortDir } }
      : sortId === 'description'
        ? { description: sortDir }
        : sortId === 'amount'
          ? { amount: sortDir }
          : sortId === 'type'
            ? { type: sortDir }
            : { name: sortDir };
  // Tiebreak on name so pagination stays stable for non-name sorts.
  const orderBy: Prisma.ItemOrderByWithRelationInput[] =
    sortId === 'name' ? [primarySort] : [primarySort, { name: 'asc' }];

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
