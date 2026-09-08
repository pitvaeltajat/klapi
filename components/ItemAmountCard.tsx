'use client';

import { memo, MouseEvent, ReactNode, useCallback, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
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
  /**
   * Typing the amount instead of tapping. The value handed over is whatever
   * parsed out of the field — the caller clamps it, exactly as it already does
   * in its own increment handler.
   */
  onAmountChange: (amount: number) => void;
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
  onAmountChange,
  onRemove,
  removeLabel,
  dimmed = false,
}: ItemAmountCardProps) {
  const image = useItemImageState(itemId);
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  // While the field has focus it holds whatever has been typed, including the
  // empty string on the way to a new number. Without that, a controlled input
  // snaps back to the old value the moment you backspace it away, and there is
  // no way to replace "12" with "3" other than selecting it first.
  const [draft, setDraft] = useState<string | null>(null);

  // ...but only for as long as the draft is the truth. The caller clamps to
  // what is actually free, so typing 99 against a stock of 25 must show 25 —
  // the same refusal the disabled + gives — rather than leaving a number on
  // screen that is not the one in the basket.
  const typed = draft === null ? null : Number.parseInt(draft, 10);
  const shown = draft === '' || typed === amount ? (draft as string) : String(amount);

  const handleTyped = (raw: string) => {
    setDraft(raw);
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) onAmountChange(parsed);
  };

  // The buttons and blur both hand the field back to the caller's value.
  const settle = useCallback(() => setDraft(null), []);

  const action = (
    <div className="flex h-9">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Vähennä ${name}`}
        onClick={() => {
          settle();
          onDecrement();
        }}
        disabled={decrementDisabled}
        className="h-full w-10 shrink-0 rounded-r-none"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        value={shown}
        onChange={(e) => handleTyped(e.target.value)}
        onBlur={settle}
        onFocus={(e) => e.currentTarget.select()}
        // `inputMode` rather than `type="number"`: the kiosk is a touchscreen,
        // so this is what raises a number pad, and it keeps the spinners off.
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={`${name} määrä`}
        className="h-full min-w-0 rounded-none border-x-0 px-1 text-center text-sm font-bold"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Lisää ${name}`}
        onClick={() => {
          settle();
          onIncrement();
        }}
        disabled={incrementDisabled}
        className="h-full w-10 shrink-0 rounded-l-none"
      >
        <Plus className="h-4 w-4" />
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
