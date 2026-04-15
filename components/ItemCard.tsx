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
      className="relative max-w-sm cursor-pointer rounded-lg border bg-card text-card-foreground shadow-lg transition-all hover:z-10 hover:scale-[1.01] hover:shadow-2xl"
    >
      <div className="relative aspect-[5/3] overflow-hidden rounded-t-lg">
        <img
          src={imageSrc}
          alt={`Picture of ${item.name}`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = placeholder;
          }}
          className="h-full w-full object-cover object-center"
        />
      </div>

      <div className="m-6 mt-2">
        <div className="mt-1 flex items-center justify-between">
          <p className="truncate text-2xl font-semibold leading-tight" title={item.name}>
            {item.name}
          </p>
        </div>

        <h5 className="text-base font-semibold">
          Vapaana: {amountLeft} / {item.amount} kpl
        </h5>

        <h5 className="min-h-[1.5em] text-base font-semibold">
          {item.categories.map((cat) => cat.name).join(', ')}
        </h5>

        {Array.isArray(item.announcements) &&
          item.announcements.length > 0 &&
          item.announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="mt-2 text-sm font-semibold text-destructive"
              onClick={stopPropagation}
            >
              <NextLink href="/item/announcements" className="flex items-center gap-1">
                <LuTriangleAlert className="mr-1" />
                Sisältää ilmoituksen
              </NextLink>
            </div>
          ))}

        <div onClick={stopPropagation} onMouseDown={stopPropagation}>
          {amountInCart > 0 ? (
            <div className="mt-4 flex h-14">
              <Button
                variant="outline"
                aria-label="decrement"
                onClick={handleDecrement}
                className="h-full w-16 shrink-0 rounded-r-none text-xl"
              >
                <FaMinus />
              </Button>
              <Input
                value={amountInCart}
                readOnly
                className="pointer-events-none h-full select-none rounded-none border-x-0 text-center text-lg font-bold"
              />
              <Button
                variant="outline"
                aria-label="increment"
                onClick={handleIncrement}
                disabled={!canTakeMoreItems}
                className="h-full w-16 shrink-0 rounded-l-none text-xl"
              >
                <FaPlus />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleAddToCart}
              className="mt-4 h-14 w-full gap-2 text-lg"
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
