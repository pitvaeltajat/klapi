import { Prisma } from '@prisma/client';

/**
 * Base where clause for fetching items that should be visible to users.
 * Excludes temporary items which are only created for custom loan requests.
 */
export const visibleItemsWhere: Prisma.ItemWhereInput = {
  type: 'normal',
};

/**
 * Standard include for items with their relations
 */
export const itemsWithRelationsInclude = {
  categories: true,
  reservations: { include: { loan: true } },
} as const;
