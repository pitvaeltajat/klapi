'use client';

import useSWR from 'swr';
import type { TemplateView } from '@/types';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Pohjien haku epäonnistui');
  return (await res.json()) as { templates: TemplateView[] };
};

export function useTemplates() {
  const { data, isLoading, mutate } = useSWR('/api/template/getTemplates', fetcher, {
    revalidateOnFocus: false,
  });

  return {
    templates: data?.templates ?? [],
    loading: isLoading,
    /** Re-fetch after an admin create/edit/delete. */
    refresh: mutate,
  };
}
