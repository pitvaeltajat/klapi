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

/**
 * What is free over a loan window. Defaults to the range in `DatesContext` —
 * the basket being built — which is what the catalogue and the cart want.
 *
 * Pass a `range` to ask about a different window: the loan edit page needs the
 * *loan's* dates, not the cart's. Going through this hook rather than a second
 * hand-rolled fetch is what gets that page the debounce, the shared SWR cache
 * and request cancellation for free.
 *
 * The debounce runs on the timestamps, not the `Date` objects. `useDebouncedValue`
 * compares by identity, so a caller handing over a freshly constructed `Date`
 * each render — which is the natural way to write `range` — would otherwise
 * reset the timer on every render and re-render again 250ms later, forever.
 */
export function useAvailabilities(range?: { start: Date; end: Date }) {
  const {
    state: { startDate, endDate },
  } = useDates();

  // Hooks can't be conditional, so the context range is always read and simply
  // ignored when a caller supplies its own.
  const debouncedStart = useDebouncedValue((range?.start ?? startDate).getTime());
  const debouncedEnd = useDebouncedValue((range?.end ?? endDate).getTime());

  const { data, isLoading } = useSWR(
    [
      '/api/availability/getAvailabilities',
      new Date(debouncedStart).toISOString(),
      new Date(debouncedEnd).toISOString(),
    ],
    fetcher,
    { revalidateOnFocus: false },
  );

  return {
    availabilities: data?.availabilities ?? null,
    loading: isLoading,
  };
}
