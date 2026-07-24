'use client';

import { memo, MouseEvent, ReactNode, useCallback } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { X } from 'lucide-react';
import { useItemImageState } from '../hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ItemCardShell from './ItemCardShell';

interface ItemAmountCardProps {
  itemId: string;
  name: string;
  amount: number;
  /** Shown under the name — availability, a warning, whatever the caller needs. */
  subtitle?: ReactNode;
  incrementDisabled?: boolean;
  decrementDisabled?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  /** When given, a remove button appears in the top-right corner. */
  onRemove?: () => void;
  /** aria-label for the corner button — say what removing means in context. */
  removeLabel?: string;
  /** Fades the card out, e.g. when the item isn't free for the chosen dates. */
  dimmed?: boolean;
}

/**
 * Compact item card with a quantity stepper: the cart drawer's line, reused
 * anywhere a list of items needs per-row amounts (the "valmiit setit" modal,
 * saving a loan as a set). Shows the item image via the same shell as the
 * catalogue cards so the same thing looks the same everywhere.
 */
const ItemAmountCard = memo(function ItemAmountCard({
  itemId,
  name,
  amount,
  subtitle,
  incrementDisabled = false,
  decrementDisabled = false,
  onIncrement,
  onDecrement,
  onRemove,
  removeLabel,
  dimmed = false,
}: ItemAmountCardProps) {
  const image = useItemImageState(itemId);
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const action = (
    <div className="flex h-9">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Vähennä ${name}`}
        onClick={onDecrement}
        disabled={decrementDisabled}
        className="h-full w-10 shrink-0 rounded-r-none"
      >
        <FaMinus />
      </Button>
      <Input
        value={amount}
        readOnly
        aria-label={`${name} määrä`}
        className="pointer-events-none h-full min-w-0 select-none rounded-none border-x-0 px-1 text-center text-sm font-bold"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Lisää ${name}`}
        onClick={onIncrement}
        disabled={incrementDisabled}
        className="h-full w-10 shrink-0 rounded-l-none"
      >
        <FaPlus />
      </Button>
    </div>
  );

  const cornerAction = onRemove ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={removeLabel ?? `Poista ${name}`}
      onClick={onRemove}
      className="h-6 w-6 rounded-full bg-background/70 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
    >
      <X className="h-3.5 w-3.5" />
    </Button>
  ) : undefined;

  return (
    <ItemCardShell
      compact
      name={name}
      imageSrc={image.src}
      placeholder={image.placeholder}
      loading={image.status === 'loading'}
      subtitle={subtitle}
      action={action}
      cornerAction={cornerAction}
      onActionPointerDown={stopPropagation}
      className={dimmed ? 'opacity-60' : undefined}
    />
  );
});

export default ItemAmountCard;
