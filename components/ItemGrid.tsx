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

export default function ItemGrid({ items }: ItemGridProps) {
  const { availabilities, loading } = useAvailabilities();

  const isRefetching = loading && availabilities !== null;

  return (
    <div
      // One column fewer from `lg` up than the viewport would suggest: that's
      // where the filter rail takes its 14rem out of the row.
      className={`grid grid-cols-1 gap-3 transition-opacity duration-150 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 2xl:grid-cols-5 ${
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
