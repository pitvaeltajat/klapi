'use client';

import { useEffect, useState } from 'react';
import { isCustomItemId } from '@/utils/customItems';

export interface InBoxItem {
  itemId: string;
  itemName: string;
}

/**
 * Asks the server which of these items are still sitting in the box from a
 * previous loan, so the confirmation dialogs can warn about their condition.
 *
 * Custom (`custom-…`) items don't exist in the catalogue, so they're skipped.
 * Shared by the cart's SubmitConfirmation and the kiosk's StartLoanConfirmation,
 * which each carried their own copy of this effect.
 */
export function useInBoxItems(itemIds: string[], enabled: boolean) {
  const [inBoxItems, setInBoxItems] = useState<InBoxItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Depend on the joined ids rather than the array: callers build a fresh array
  // every render, which would otherwise re-fire the fetch on every keystroke.
  const key = itemIds.join(',');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const ids = key.split(',').filter((id) => id && !isCustomItemId(id));
      if (!enabled || ids.length === 0) {
        setInBoxItems([]);
        return;
      }

      setIsChecking(true);
      try {
        const response = await fetch('/api/reservation/checkInBox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds: ids }),
        });
        if (response.ok) {
          const data = await response.json();
          if (!cancelled) setInBoxItems(data.inBoxItems || []);
        }
      } catch (error) {
        console.error('Failed to check in-box items:', error);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return { inBoxItems, isChecking };
}
