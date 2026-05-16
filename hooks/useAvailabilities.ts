'use client';

import useSWR from 'swr';
import { useDates } from '@/contexts/DatesContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface Availability {
  available: number;
}

interface AvailabilityResponse {
  availabilities: Record<string, Availability>;
}

const fetcher = async ([, start, end]: [string, string, string]) => {
  const res = await fetch('/api/availability/getAvailabilities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ StartDate: start, EndDate: end }),
  });
  return (await res.json()) as AvailabilityResponse;
};

export function useAvailabilities() {
  const {
    state: { startDate, endDate },
  } = useDates();

  const debouncedStart = useDebouncedValue(startDate);
  const debouncedEnd = useDebouncedValue(endDate);

  const startKey = debouncedStart.toISOString();
  const endKey = debouncedEnd.toISOString();

  const { data, isLoading } = useSWR(
    ['/api/availability/getAvailabilities', startKey, endKey],
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    availabilities: data?.availabilities ?? null,
    loading: isLoading,
  };
}
