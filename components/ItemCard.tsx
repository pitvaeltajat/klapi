import NextLink from 'next/link';
import { ItemCardProps } from '../types';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useCallback, useMemo, memo, MouseEvent } from 'react';
import { FaCartArrowDown, FaPlus, FaMinus } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { LuTriangleAlert } from 'react-icons/lu';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ItemCard = memo(function ItemCard({ item, availableAmount }: ItemCardProps) {
  const {
    addToCart,
    incrementAmount,
    decrementAmount,
    state: { items: cartItems },
  } = useCart();
  const router = useRouter();
  const imageSrc = useItemImage(item.id);
  const placeholder = usePlaceholder();

  const amountInCart = useMemo(
    () => cartItems.find((cartItem) => cartItem.id === item.id)?.amount ?? 0,
    [cartItems, item.id],
  );

  const amountLeft = useMemo(() => availableAmount - amountInCart, [availableAmount, amountInCart]);
  const canTakeMoreItems = useMemo(() => amountLeft > 0, [amountLeft]);

  const handleAddToCart = useCallback(() => {
    addToCart({
      id: item.id,
      name: item.name,
      amount: amountInCart + 1,
    });
    toast.success('Lisättiin kama', {
      description: `${item.name} lisätty ostoskoriin`,
      duration: 1500,
    });
  }, [addToCart, item.id, item.name, amountInCart]);

  const handleIncrement = useCallback(() => {
    incrementAmount(item.id);
  }, [incrementAmount, item.id]);

  const handleDecrement = useCallback(() => {
    decrementAmount(item.id);
  }, [decrementAmount, item.id]);

  const handleCardClick = useCallback(() => {
    router.push(`/item/${item.id}`);
  }, [router, item.id]);

  const stopPropagation = useCallback((e: MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      onClick={handleCardClick}
      className="relative flex cursor-pointer overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all sm:flex-col sm:shadow-lg sm:hover:z-10 sm:hover:scale-[1.01] sm:hover:shadow-2xl"
    >
      <div className="relative aspect-square w-28 shrink-0 overflow-hidden bg-muted sm:aspect-[5/3] sm:w-full">
        <img
          src={imageSrc}
          alt={`Picture of ${item.name}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:p-5">
        <p
          className="truncate text-base font-semibold leading-tight sm:text-2xl"
          title={item.name}
        >
          {item.name}
        </p>

        <p className="text-sm font-semibold sm:mt-1 sm:text-base">
          Vapaana: {amountLeft} / {item.amount} kpl
        </p>

        <p className="truncate text-xs text-muted-foreground sm:min-h-[1.5em] sm:text-sm">
          {item.categories.map((cat) => cat.name).join(', ')}
        </p>

        {Array.isArray(item.announcements) &&
          item.announcements.length > 0 &&
          item.announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="mt-1 text-xs font-semibold text-destructive sm:text-sm"
              onClick={stopPropagation}
            >
              <NextLink href="/item/announcements" className="flex items-center gap-1">
                <LuTriangleAlert className="shrink-0" />
                <span className="truncate">Sisältää ilmoituksen</span>
              </NextLink>
            </div>
          ))}

        <div
          className="mt-auto pt-2 sm:pt-0"
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {amountInCart > 0 ? (
            <div className="flex h-11 sm:mt-4 sm:h-14">
              <Button
                variant="outline"
                aria-label="decrement"
                onClick={handleDecrement}
                className="h-full w-12 shrink-0 rounded-r-none text-lg sm:w-16 sm:text-xl"
              >
                <FaMinus />
              </Button>
              <Input
                value={amountInCart}
                readOnly
                className="pointer-events-none h-full min-w-0 select-none rounded-none border-x-0 px-1 text-center text-base font-bold sm:text-lg"
              />
              <Button
                variant="outline"
                aria-label="increment"
                onClick={handleIncrement}
                disabled={!canTakeMoreItems}
                className="h-full w-12 shrink-0 rounded-l-none text-lg sm:w-16 sm:text-xl"
              >
                <FaPlus />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAddToCart}
              className="h-11 w-full gap-2 text-base sm:mt-4 sm:h-14 sm:text-lg"
              disabled={!canTakeMoreItems}
            >
              {canTakeMoreItems ? 'Lisää' : 'Ei saatavilla'}
              {canTakeMoreItems && <FaCartArrowDown />}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
});

export default ItemCard;
