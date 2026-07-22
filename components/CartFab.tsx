'use client';

import React from 'react';
import { FaShoppingCart } from 'react-icons/fa';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Floating cart button, bottom right. The cart otherwise lives only in the top
 * bar, which slides out of the way while scrolling the catalogue — this keeps it
 * one tap away from anywhere in the list.
 *
 * It only shows up once the cart actually holds something, so an empty screen
 * stays clean, and it steps aside while the drawer itself is open.
 */
export function useCartFabVisible(isOpen: boolean): boolean {
  const {
    state: { items },
  } = useCart();
  const { state: dates } = useDates();
  // Same gate as the top bar's cart button: without a chosen range there is
  // nothing to add items to.
  return !isOpen && dates.datesSet && items.length > 0;
}

export default function CartFab({ onOpen, isOpen }: { onOpen: () => void; isOpen: boolean }) {
  const {
    state: { items },
  } = useCart();

  const totalItems = items.reduce((sum, item) => sum + item.amount, 0);
  const hidden = !useCartFabVisible(isOpen);

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-40 transition-all duration-200 motion-reduce:transition-none',
        hidden && 'pointer-events-none translate-y-4 opacity-0',
      )}
      inert={hidden}
    >
      <Button
        aria-label={`Avaa ostoskori (${totalItems})`}
        size="icon"
        className="relative size-14 rounded-full shadow-lg"
        onClick={onOpen}
      >
        <FaShoppingCart className="size-5" />
        <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-destructive text-sm font-bold text-white shadow-md">
          {totalItems}
        </span>
      </Button>
    </div>
  );
}
