import { Prisma } from '@prisma/client';

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
