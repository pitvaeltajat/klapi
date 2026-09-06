import { Prisma, LoanStatus } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import prisma from '@/utils/prisma';
import { activeLoansWhere } from '@/utils/loanQueries';

/**
 * Items that have not been soft-archived. Use anywhere a "live" item is
 * required (loan creation, availability, public detail pages).
 */
export const activeItemsWhere: Prisma.ItemWhereInput = {
  deletedAt: null,
};

/**
 * Base where clause for fetching items that should be visible to users.
 * Excludes temporary items (only created for custom loan requests) and
 * soft-archived items.
 */
export const visibleItemsWhere: Prisma.ItemWhereInput = {
  type: 'normal',
  deletedAt: null,
};

/**
 * Standard include for items with their relations.
 * Reservation/loan data is intentionally omitted — clients fetch availability
 * separately via /api/availability/getAvailabilities.
 */
export const itemsWithRelationsInclude = {
  categories: true,
  announcements: { orderBy: { createdAt: 'desc' } },
} as const;

/**
 * The admin inventory listing's filters and ordering, read off the query
 * string. Shared by `item/getInventory` (which pages on top of it) and
 * `item/exportInventory` (which doesn't), so the spreadsheet always contains
 * exactly the rows the table was showing.
 *
 * Query params:
 *   search    case-insensitive match on name/description
 *   type      'normal' | 'temporary' (omitted = both)
 *   category  category id to filter by
 *   archived  'all' to include soft-archived items (default: active only)
 *   sort      column id: name | description | amount | type | location
 *   dir       'asc' | 'desc' (default asc)
 */
export function inventoryQuery(params: URLSearchParams): {
  where: Prisma.ItemWhereInput;
  orderBy: Prisma.ItemOrderByWithRelationInput[];
} {
  const search = params.get('search')?.trim() ?? '';
  const typeParam = params.get('type');
  const category = params.get('category')?.trim() ?? '';
  const includeArchived = params.get('archived') === 'all';
  const sortDir: Prisma.SortOrder = params.get('dir') === 'desc' ? 'desc' : 'asc';
  const sortId = params.get('sort') ?? 'name';

  const where: Prisma.ItemWhereInput = {
    ...(includeArchived ? {} : { deletedAt: null }),
    ...(typeParam === 'normal' || typeParam === 'temporary' ? { type: typeParam } : {}),
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

  return { where, orderBy };
}

/**
 * Rolling window (in days) for the "most loaned" ranking. ~12 months so a full
 * seasonal year of loans counts toward an item's popularity, while older loans
 * eventually age out and stop skewing the order.
 */
const POPULARITY_WINDOW_DAYS = 365;

/**
 * itemId -> number of bookings within the rolling window. Drives the
 * "Suosituimmat" sort on the home page.
 *
 * Cached for 15 min: popularity drifts slowly, and the home page is
 * force-dynamic (the query would otherwise run on every visit) on a single
 * low-resource kiosk. REJECTED/CANCELLED loans are excluded so abandoned
 * requests don't count as demand.
 */
export const getPopularityMap = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const cutoff = new Date(Date.now() - POPULARITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const grouped = await prisma.reservation.groupBy({
      by: ['itemId'],
      where: {
        loan: {
          ...activeLoansWhere,
          startTime: { gte: cutoff },
          status: { notIn: [LoanStatus.REJECTED, LoanStatus.CANCELLED] },
        },
      },
      _count: { _all: true },
    });
    return Object.fromEntries(grouped.map((g) => [g.itemId, g._count._all]));
  },
  ['item-popularity'],
  { revalidate: 900, tags: ['item-popularity'] },
);
