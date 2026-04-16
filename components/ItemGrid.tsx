'use client';

import React, { useState, useEffect } from 'react';
import ItemCard from '@/components/ItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDates } from '@/contexts/DatesContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
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

  useEffect(() => {
    setLoading(true);
    fetch('/api/availability/getAvailabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ StartDate: startDate, EndDate: endDate }),
    })
      .then((response) => response.json())
      .then((data: AvailabilityResponse) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, [startDate, endDate]);

  const availabilities = data?.availabilities;

  if (loading) {
    if (!showLoading) return null;
    return <LoadingSpinner minHeight="30vh" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:gap-6 lg:grid-cols-3 lg:gap-8 xl:grid-cols-4 xl:gap-10">
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
