'use client';

import { usePathname } from 'next/navigation';

/**
 * Max width of the page shell, as a Tailwind class.
 *
 * The catalogue spends 16rem of its width on the filter rail and gains a card
 * column with every extra 280px, so it runs wider than the text-shaped pages.
 * The top bar reads this too — header and content have to line up.
 */
export function usePageMaxWidth(): string {
  return usePathname() === '/' ? 'max-w-[1800px]' : 'max-w-[1280px]';
}
