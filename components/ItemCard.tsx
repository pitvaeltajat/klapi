import { ItemCardProps } from '../types';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { useCallback, useMemo, memo, MouseEvent } from 'react';
import { FaCartArrowDown, FaPlus, FaMinus } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { useItemImage, usePlaceholder } from '../hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ItemCardShell from './ItemCardShell';

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
    addToCart({ id: item.id, name: item.name, amount: amountInCart + 1 });
    toast.success('Lisättiin kama', {
      description: `${item.name} lisätty ostoskoriin`,
      duration: 1500,
    });
  }, [addToCart, item.id, item.name, amountInCart]);

  const handleIncrement = useCallback(() => incrementAmount(item.id), [incrementAmount, item.id]);
  const handleDecrement = useCallback(() => decrementAmount(item.id), [decrementAmount, item.id]);
  const handleCardClick = useCallback(() => router.push(`/item/${item.id}`), [router, item.id]);
  const stopPropagation = useCallback((e: MouseEvent) => e.stopPropagation(), []);

  const action =
    amountInCart > 0 ? (
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
    );

  return (
    <ItemCardShell
      name={item.name}
      imageSrc={imageSrc}
      placeholder={placeholder}
      subtitle={`Vapaana: ${amountLeft} / ${item.amount} kpl`}
      categoryLine={item.categories.map((cat) => cat.name).join(', ')}
      announcements={item.announcements}
      onClick={handleCardClick}
      action={action}
      onActionPointerDown={stopPropagation}
    />
  );
});

export default ItemCard;
