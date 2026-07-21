'use client';

import { memo, MouseEvent, useCallback } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { X } from 'lucide-react';
import type { CartItem } from '../types';
import { useItemImageState } from '../hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ItemCardShell from './ItemCardShell';

interface CartItemRowProps {
  item: CartItem;
  incrementDisabled: boolean;
  /** Shown under the name when the chosen amount no longer fits the dates. */
  warning?: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/**
 * Compact cart line that reuses the mobile item card shell — shows the item
 * image, name, a quantity stepper, and a corner remove button.
 */
const CartItemRow = memo(function CartItemRow({
  item,
  incrementDisabled,
  warning,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemRowProps) {
  const image = useItemImageState(item.id);
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const action = (
    <div className="flex h-9">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="decrement"
        onClick={onDecrement}
        className="h-full w-10 shrink-0 rounded-r-none"
      >
        <FaMinus />
      </Button>
      <Input
        value={item.amount}
        readOnly
        aria-label={`${item.name} määrä`}
        className="pointer-events-none h-full min-w-0 select-none rounded-none border-x-0 px-1 text-center text-sm font-bold"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="increment"
        onClick={onIncrement}
        disabled={incrementDisabled}
        className="h-full w-10 shrink-0 rounded-l-none"
      >
        <FaPlus />
      </Button>
    </div>
  );

  const cornerAction = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Poista ${item.name} ostoskorista`}
      onClick={onRemove}
      className="h-6 w-6 rounded-full bg-background/70 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <ItemCardShell
      compact
      name={item.name}
      imageSrc={image.src}
      placeholder={image.placeholder}
      loading={image.status === 'loading'}
      subtitle={warning ? <span className="text-warning">{warning}</span> : undefined}
      action={action}
      cornerAction={cornerAction}
      onActionPointerDown={stopPropagation}
    />
  );
});

export default CartItemRow;
