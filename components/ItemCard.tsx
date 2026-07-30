'use client';

import { ItemCardProps } from '../types';
import { useCart } from '@/contexts/CartContext';
import { useCallback, useMemo, memo, MouseEvent } from 'react';
import { Minus, Package, Plus, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useItemImageState } from '../hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ItemCardShell from './ItemCardShell';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const ItemCard = memo(function ItemCard({
  item,
  availableAmount,
  availabilityLoading = false,
  availabilityKnown = true,
}: ItemCardProps) {
  const {
    addToCart,
    incrementAmount,
    decrementAmount,
    state: { items: cartItems },
  } = useCart();
  const router = useRouter();
  const image = useItemImageState(item.id);

  const amountInCart = useMemo(
    () => cartItems.find((cartItem) => cartItem.id === item.id)?.amount ?? 0,
    [cartItems, item.id],
  );

  const amountLeft = useMemo(() => availableAmount - amountInCart, [availableAmount, amountInCart]);
  const canTakeMoreItems = useMemo(() => amountLeft > 0, [amountLeft]);

  // No toast here: the button swaps to a stepper and the header badge counts up,
  // so a per-item toast only stacks up over the corner while filling a basket.
  const handleAddToCart = useCallback(() => {
    addToCart({ id: item.id, name: item.name, amount: amountInCart + 1 });
  }, [addToCart, item.id, item.name, amountInCart]);

  const handleIncrement = useCallback(() => incrementAmount(item.id), [incrementAmount, item.id]);
  const handleDecrement = useCallback(() => decrementAmount(item.id), [decrementAmount, item.id]);
  const handleCardClick = useCallback(() => router.push(`/item/${item.id}`), [router, item.id]);
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const subtitle = availabilityKnown ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex w-fit items-center gap-1.5',
            amountLeft > 0 ? 'text-success' : 'text-destructive',
          )}
          aria-label={`Vapaana ${Math.max(0, amountLeft)} / ${item.amount} kpl`}
        >
          <Package className="size-4 shrink-0" aria-hidden />
          {/* Clamped: a cart built for other dates can exceed what's now free,
              and "-2 vapaana" reads as a bug. The cart drawer flags the excess. */}
          {Math.max(0, amountLeft)} / {item.amount} kpl
        </span>
      </TooltipTrigger>
      <TooltipContent>Vapaana</TooltipContent>
    </Tooltip>
  ) : (
    <Skeleton className="h-4 w-32" />
  );

  const actionDisabled = !canTakeMoreItems || (availabilityLoading && !availabilityKnown);

  const action =
    amountInCart > 0 ? (
      <div className="flex h-11 sm:mt-3 sm:h-11">
        <Button
          variant="outline"
          aria-label="decrement"
          onClick={handleDecrement}
          className="h-full w-12 shrink-0 rounded-r-none text-lg sm:w-14 sm:text-lg"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Input
          value={amountInCart}
          readOnly
          className="pointer-events-none h-full min-w-0 select-none rounded-none border-x-0 px-1 text-center text-base font-bold sm:text-base"
        />
        <Button
          variant="outline"
          aria-label="increment"
          onClick={handleIncrement}
          disabled={!canTakeMoreItems}
          className="h-full w-12 shrink-0 rounded-l-none text-lg sm:w-14 sm:text-lg"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    ) : (
      <Button
        onClick={handleAddToCart}
        className="h-11 w-full gap-2 text-base sm:mt-3 sm:h-11 sm:text-base"
        disabled={actionDisabled}
      >
        {!availabilityKnown
          ? 'Ladataan…'
          : canTakeMoreItems
            ? 'Lisää'
            : 'Ei saatavilla'}
        {availabilityKnown && canTakeMoreItems && <ShoppingCart className="h-4 w-4" />}
      </Button>
    );

  return (
    <ItemCardShell
      name={item.name}
      imageSrc={image.src}
      placeholder={image.placeholder}
      loading={image.status === 'loading'}
      subtitle={subtitle}
      categoryLine={item.categories.map((cat) => cat.name).join(', ')}
      announcements={item.announcements}
      onClick={handleCardClick}
      action={action}
      onActionPointerDown={stopPropagation}
    />
  );
});

export default ItemCard;
