import React from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import ItemCard from '../components/ItemCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDates } from '@/contexts/DatesContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import { useState } from 'react';
import { useEffect } from 'react';
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

interface AllItemsProps {
  items: ItemWithCategories[];
  categories: Category[];
}

export default function AllItems({ items }: AllItemsProps) {
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        StartDate: startDate,
        EndDate: endDate,
      }),
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
    if (!showLoading) {
      return null;
    }
    return <LoadingSpinner minHeight="30vh" />;
  }

  return (
    <>
      <SimpleGrid columns={[1, 2, 2, 3, 4]} spacing={[4, 6, 8, 10]}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={{
              id: item.id,
              name: item.name,
              description: item.description || undefined,
              amount: item.amount,
              categories: item.categories.map((cat) => ({
                id: cat.id,
                name: cat.name,
              })),
              announcements: item.announcements || null,
            }}
            availableAmount={availabilities?.[item.id]?.available ?? 0}
          />
        ))}
      </SimpleGrid>
    </>
  );
}
