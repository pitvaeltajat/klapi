'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import type { TemplateView } from '@/types';
import { cn } from '@/lib/utils';

interface TemplateDialogProps {
  template: TemplateView;
  onClose: () => void;
}

interface Row {
  itemId: string;
  name: string;
  /** What the template suggests. */
  suggested: number;
  /** Total units in storage. */
  stock: number;
  /** Already in the cart for these dates. */
  inCart: number;
  /** Most this dialog may still add: `available` minus what's already in the cart. */
  headroom: number;
}

/**
 * The "suggested set" modal. Deliberately not a confirm-and-go: every row is a
 * stepper the loaner can dial down to zero, because a template is a starting
 * point rather than a package deal. Amounts arrive pre-clamped to what's
 * actually free for the chosen dates, so the loaner never has to discover the
 * conflict later in the cart drawer.
 */
export default function TemplateDialog({ template, onClose }: TemplateDialogProps) {
  const {
    addToCart,
    state: { items: cartItems },
  } = useCart();
  const { availabilities } = useAvailabilities();

  // Only the rows the loaner actually touched. Everything else falls back to
  // the template's own number clamped to what's free, so the amounts stay
  // correct as availability loads in without an effect racing to re-seed them.
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const rows: Row[] | null = useMemo(() => {
    if (availabilities === null) return null;
    return template.items.map((entry) => {
      const available = availabilities[entry.itemId]?.available ?? 0;
      const inCart = cartItems.find((cartItem) => cartItem.id === entry.itemId)?.amount ?? 0;
      return {
        itemId: entry.itemId,
        name: entry.name,
        suggested: entry.amount,
        stock: entry.stock,
        inCart,
        headroom: Math.max(0, available - inCart),
      };
    });
  }, [template.items, availabilities, cartItems]);

  // Clamped on read, not on write: the cart is shared state that can grow
  // behind this dialog, and re-clamping here keeps every row honest without a
  // second copy of the numbers to keep in sync.
  const amountFor = (row: Row) => Math.min(overrides[row.itemId] ?? row.suggested, row.headroom);

  const setAmount = (itemId: string, next: number) =>
    setOverrides((current) => ({ ...current, [itemId]: next }));

  const chosen = rows?.filter((row) => amountFor(row) > 0) ?? [];
  // Any row we had to dial below what the template asks for — worth calling out
  // once above the footer so a clamped set doesn't look like the admin's doing.
  const clamped = rows?.filter((row) => row.headroom < row.suggested) ?? [];

  const handleConfirm = () => {
    for (const row of chosen) {
      // Add on top of whatever is already in the cart, like the item cards do.
      addToCart({ id: row.itemId, name: row.name, amount: row.inCart + amountFor(row) });
    }
    toast.success('Lisättiin koriin', {
      description: `${template.name}: ${chosen.length} kamaa`,
      duration: 2000,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{template.name}</DialogTitle>
          {/* Block spans rather than paragraphs: DialogDescription renders a
              <p>, which may not contain one. */}
          <DialogDescription className="space-y-1.5">
            {template.description && (
              <span className="block text-foreground">{template.description}</span>
            )}
            <span className="block">
              Tämä on ehdotus, ei pakkopaketti — säädä määriä tai pudota kamoja pois nollaan ennen
              kuin lisäät ne koriin.
            </span>
          </DialogDescription>
        </DialogHeader>

        {rows === null ? (
          <div className="flex flex-col gap-3">
            {template.items.map((entry) => (
              <Skeleton key={entry.itemId} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ul className="flex flex-col divide-y">
            {rows.map((row) => {
              const amount = amountFor(row);
              return (
                <li
                  key={row.itemId}
                  className={cn(
                    'flex items-center gap-3 py-3',
                    row.headroom === 0 && 'opacity-60',
                  )}
                >
                  <div className="flex h-9 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Vähennä ${row.name}`}
                      onClick={() => setAmount(row.itemId, Math.max(0, amount - 1))}
                      disabled={amount <= 0}
                      className="h-full w-9 rounded-r-none"
                    >
                      <FaMinus />
                    </Button>
                    <Input
                      value={amount}
                      readOnly
                      aria-label={`${row.name} määrä`}
                      className="pointer-events-none h-full w-11 select-none rounded-none border-x-0 px-1 text-center font-bold"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Lisää ${row.name}`}
                      onClick={() => setAmount(row.itemId, Math.min(row.headroom, amount + 1))}
                      disabled={amount >= row.headroom}
                      className="h-full w-9 rounded-l-none"
                    >
                      <FaPlus />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.name}</p>
                    <p
                      className={cn(
                        'flex items-center gap-1.5 text-sm',
                        row.headroom === 0
                          ? 'text-destructive'
                          : row.headroom < row.suggested
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                    >
                      <Package className="size-3.5 shrink-0" aria-hidden />
                      {row.headroom === 0
                        ? 'Ei vapaana valitulla ajanjaksolla'
                        : row.headroom < row.suggested
                          ? `Vain ${row.headroom} / ${row.suggested} vapaana`
                          : `${row.headroom} / ${row.stock} vapaana`}
                      {row.inCart > 0 && (
                        <span className="text-muted-foreground">· korissa jo {row.inCart}</span>
                      )}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {clamped.length > 0 && (
          <p className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm">
            Osaa kamoista ei ole tarpeeksi vapaana valitulla ajanjaksolla, joten määrät on
            pudotettu siihen mitä on vielä vapaana.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>
            Peruuta
          </Button>
          <Button onClick={handleConfirm} disabled={rows === null || chosen.length === 0}>
            {chosen.length === 0
              ? 'Ei lisättävää'
              : `Lisää koriin (${chosen.length} kamaa)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
