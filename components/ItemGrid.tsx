'use client';

import React from 'react';
import ItemCard from '@/components/ItemCard';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { Item, Category, Announcement } from '@prisma/client';

interface ItemWithCategories extends Item {
  categories: Category[];
  announcements: Announcement[];
}

interface ItemGridProps {
  items: ItemWithCategories[];
  categories: Category[];
}

/** Shared so the "valmiit setit" cards line up with the item cards below them. */
export const ITEM_GRID_CLASSES =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6';

export default function ItemGrid({ items }: ItemGridProps) {
  const { availabilities, loading } = useAvailabilities();

  const isRefetching = loading && availabilities !== null;

  return (
    <div
      className={`${ITEM_GRID_CLASSES} transition-opacity duration-150 ${
        isRefetching ? 'opacity-80' : 'opacity-100'
      }`}
      aria-busy={loading}
    >
      {items.map((item) => {
        const known = availabilities !== null;
        return (
          <ItemCard
            key={item.id}
            item={{
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              amount: item.amount,
              categories: item.categories.map((cat) => ({ id: cat.id, name: cat.name })),
              announcements: item.announcements || null,
            }}
            availableAmount={availabilities?.[item.id]?.available ?? 0}
            availabilityLoading={loading}
            availabilityKnown={known}
          />
        );
      })}
    </div>
  );
}
