'use client';

import React from 'react';
import useSWR from 'swr';
import ItemGrid from '@/components/ItemGrid';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDates } from '@/contexts/DatesContext';

export default function ProductListPage() {
  const {
    state: { startDate, endDate },
  } = useDates();

  const { data: items, isLoading } = useSWR(
    '/api/item/getItems',
    (url: string) => fetch(url).then((res) => res.json()),
  );

  if (isLoading || !items) return <LoadingSpinner fullWidth />;

  return <ItemGrid items={items} categories={[]} />;
}
