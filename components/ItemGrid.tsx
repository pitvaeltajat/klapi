'use client';

import React, { useState, useEffect } from 'react';
import ItemCard from '@/components/ItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDates } from '@/contexts/DatesContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
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

  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading);

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
        setData(data);
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

  const availabilities = data?.availabilities;

  if (loading) {
    if (!showLoading) return null;
    return <LoadingSpinner minHeight="30vh" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5 2xl:grid-cols-6">
      {items.map((item) => (
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
        />
      ))}
    </div>
  );
}
