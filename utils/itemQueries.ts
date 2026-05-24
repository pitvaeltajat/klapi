import { Prisma, LoanStatus } from '@prisma/client';
import { unstable_cache } from 'next/cache';
import prisma from '@/utils/prisma';

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
 * Rolling window (in days) for the "most loaned" ranking. ~12 months so a full
 * seasonal year of loans counts toward an item's popularity, while older loans
 * eventually age out and stop skewing the order.
 */
export const POPULARITY_WINDOW_DAYS = 365;

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
