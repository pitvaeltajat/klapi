'use client';

import React, { useState, useEffect } from 'react';
import ItemCard from '@/components/ItemCard';
import { useDates } from '@/contexts/DatesContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { Item, Category, Announcement } from '@prisma/client';

interface ItemWithCategories extends Item {
  categories: Category[];
  announcements: Announcement[];
}

interface Availability {
  available: number;
}

interface AvailabilityResponse {
  availabilities: Record<string, Availability>;
}

interface ItemGridProps {
  items: ItemWithCategories[];
  categories: Category[];
}

export default function ItemGrid({ items }: ItemGridProps) {
  const {
    state: { startDate, endDate },
  } = useDates();

  const [availabilities, setAvailabilities] = useState<Record<string, Availability> | null>(null);
  const [loading, setLoading] = useState(true);

  const debouncedStart = useDebouncedValue(startDate);
  const debouncedEnd = useDebouncedValue(endDate);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional loading state before async fetch
    fetch('/api/availability/getAvailabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ StartDate: debouncedStart, EndDate: debouncedEnd }),
      signal: ctrl.signal,
    })
      .then((response) => response.json())
      .then((data: AvailabilityResponse) => {
        setAvailabilities(data.availabilities);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          console.log(error);
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [debouncedStart, debouncedEnd]);

  const isRefetching = loading && availabilities !== null;

  return (
    <div
      className={`grid grid-cols-1 gap-3 transition-opacity duration-150 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6 ${
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
