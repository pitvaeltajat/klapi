'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { CircleAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import SubmitConfirmation from './SubmitConfirmation';
import LoanerAutocomplete from './LoanerAutocomplete';
import ItemAmountCard from './ItemAmountCard';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { isCustomItemId } from '@/utils/customItems';
import { isKioskMachine } from '@/utils/kioskSession';
import { formatDateNumeric } from '@/utils/dateFormat';
import { cn } from '@/lib/utils';

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const firstField = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const {
    state: cart,
    addToCart,
    incrementAmount,
    decrementAmount,
    removeFromCart,
    setDescription,
    setLoaner,
    setUserId,
  } = useCart();
  const cartItems = cart.items;
  const { state: dates } = useDates();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const startTime = dates.startDate;
  const endTime = dates.endDate;

  // Shared with the item grid, so opening the cart reuses the already-fetched
  // availabilities for this range instead of firing its own request.
  const { availabilities } = useAvailabilities();

  const isAdmin = session?.user?.group === 'ADMIN';
  // The kaluston kone, whether or not an admin is currently elevated on it:
  // whoever is standing there is lending to the person in front of them, not to
  // themselves. See `utils/kioskSession.ts`.
  const isKiosk = isKioskMachine(session?.user);

  const hasInitializedLoaner = useRef(false);
  const [localDescription, setLocalDescription] = useState(cart.description);

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- reset description when cart empties */
  useEffect(() => {
    if (cart.items.length === 0 && localDescription !== '') {
      setLocalDescription('');
    }
  }, [cart.items.length]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDescription(localDescription);
    }, 300);
    return () => clearTimeout(timeout);
  }, [localDescription, setDescription]);

  const [reportContent, setReportContent] = useState('');

  // The cart is a non-modal drawer (so the cart toggle button in the header
  // stays clickable), which means Radix doesn't lock body scroll. On mobile the
  // drawer covers the whole screen, so lock the page behind it — pinning the
  // body with `position: fixed` is the reliable way to stop iOS touch-scroll.
  // On desktop the drawer is a sidebar and the catalog stays visible beside it,
  // so leave the page scrollable to keep browsing while the cart is open.
  useEffect(() => {
    if (!isOpen) return;
    if (window.matchMedia('(min-width: 768px)').matches) return;
    const { body } = document;
    const scrollY = window.scrollY;
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.insetInline = '0';
    body.style.width = '100%';
    return () => {
      body.style.position = '';
      body.style.top = '';
      body.style.insetInline = '';
      body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isKiosk || !session?.user) return;
    // Name first: `loaner` is what the loan is labelled by everywhere it is
    // shown — the loan page, the return screen, the calendar event's title —
    // and an address reads like a mailbox rather than a person.
    const userDisplayName = session.user.name || session.user.email || '';
    // An admin may retype the field to lend on someone else's behalf, so seed
    // it once and then leave it alone. For an ordinary member it is read-only
    // and can only ever be their own account, so keep it in sync instead of
    // latching: a one-shot ref there had no way back if the value was lost
    // after it fired, and the empty field disables the submit button.
    if (isAdmin) {
      if (hasInitializedLoaner.current) return;
      hasInitializedLoaner.current = true;
    } else if (cart.loaner === userDisplayName && cart.userId === session.user.id) {
      return;
    }
    setLoaner(userDisplayName);
    setUserId(session.user.id);
  }, [isAdmin, isKiosk, session, cart.loaner, cart.userId, setLoaner, setUserId]);

  // Changing the loan dates keeps the cart, so a basket built for one range can
  // outrun what's free in another. Anything now over its limit is listed here
  // with the amount that would still fit, and blocks submitting until fixed.
  // Custom items have no stock to run out of, so they're exempt.
  const overBooked = useMemo(() => {
    const over = new Map<string, number>();
    if (!availabilities) return over;
    for (const item of cartItems) {
      if (isCustomItemId(item.id)) continue;
      const available = availabilities[item.id]?.available ?? 0;
      if (item.amount > available) over.set(item.id, available);
    }
    return over;
  }, [availabilities, cartItems]);

  const handleFixAmounts = () => {
    for (const [id, available] of overBooked) {
      const item = cartItems.find((cartItem) => cartItem.id === id);
      if (!item) continue;
      if (available <= 0) removeFromCart(id);
      else addToCart({ ...item, amount: available });
    }
  };

  const isDescriptionValid = localDescription.trim().length > 0;

  return (
    <Drawer open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)} modal={false}>
      <DrawerContent
        side="right"
        className="flex max-h-dvh w-full flex-col md:max-w-md"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          firstField.current?.focus();
        }}
      >
        <DrawerHeader>
          <DrawerTitle>Ostoskori</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
          <SubmitConfirmation
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            closeDrawer={onClose}
            reportContent={reportContent}
            setReportContent={setReportContent}
          />
          <div className="space-y-1">
            <div>
              <Label htmlFor="description">
                Kuvaus <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={firstField}
                id="description"
                name="description"
                placeholder="Pikachujen maastoretki"
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                required
                aria-invalid={!isDescriptionValid && cart.items.length > 0}
                className={cn(
                  !isDescriptionValid &&
                    cart.items.length > 0 &&
                    'border-destructive focus-visible:ring-destructive',
                )}
              />
            </div>
            <div>
              <Label htmlFor="loaner">
                Lainaaja <span className="text-destructive">*</span>
              </Label>
              {isAdmin || isKiosk ? (
                <LoanerAutocomplete
                  value={cart.loaner || ''}
                  onChange={(value, userId) => {
                    setLoaner(value);
                    setUserId(userId);
                  }}
                  placeholder="Lainaajan nimi tai sähköposti (pakollinen)"
                  size="md"
                />
              ) : (
                <Input id="loaner" value={cart.loaner || ''} disabled className="bg-muted" />
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="space-y-1">
                  <div>
                    <Label htmlFor="startTime">Lainaus alkaa</Label>
                    <Input
                      id="startTime"
                      value={formatDateNumeric(startTime)}
                      readOnly
                      tabIndex={-1}
                      className="cursor-default select-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Lainaus loppuu</Label>
                    <Input
                      id="endTime"
                      value={formatDateNumeric(endTime)}
                      readOnly
                      tabIndex={-1}
                      className="cursor-default select-none"
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                Voit vaihtaa päiviä katalogin yläpalkista — ostoskori säilyy
              </TooltipContent>
            </Tooltip>
          </div>

          {cart.items.length > 0 ? (
            <div className="mt-5 space-y-2">
              <h3 className="text-base font-semibold">Valitut tavarat</h3>
              {overBooked.size > 0 && (
                <Alert variant="warning" title="Osa kamoista ei mahdu valitulle ajalle">
                  <p>
                    Valitsemasi päivät muuttuivat, eikä alla merkittyjä kamoja ole enää yhtä
                    montaa vapaana. Pienennä määriä tai korjaa ne kerralla.
                  </p>
                  <Button variant="warning" size="sm" className="mt-2" onClick={handleFixAmounts}>
                    Korjaa määrät
                  </Button>
                </Alert>
              )}
              {cart.items.map((item) => {
                if (item.amount <= 0) return null;
                const isCustomItem = isCustomItemId(item.id);
                const available = availabilities?.[item.id]?.available ?? 0;
                const isIncrementDisabled = isCustomItem
                  ? false
                  : availabilities === null || item.amount >= available;

                return (
                  <ItemAmountCard
                    key={item.id}
                    itemId={item.id}
                    name={item.name}
                    amount={item.amount}
                    incrementDisabled={isIncrementDisabled}
                    subtitle={
                      overBooked.has(item.id) ? (
                        <span className="text-warning">
                          Vain {overBooked.get(item.id)} vapaana valitulla ajalla
                        </span>
                      ) : undefined
                    }
                    onIncrement={() => incrementAmount(item.id)}
                    onDecrement={() => decrementAmount(item.id)}
                    onRemove={() => removeFromCart(item.id)}
                    removeLabel={`Poista ${item.name} ostoskorista`}
                  />
                );
              })}
            </div>
          ) : (
            <EmptyState
              className="flex-1 justify-center border-0 bg-transparent"
              title="Ostoskori on tyhjä"
              description="Lisää tavaroita ostoskoriin aloittaaksesi lainauksen"
            />
          )}

          {isKiosk && cart.items.length > 0 && (
            <Card variant="muted" padding="md" className="mt-6">
              <Label htmlFor="pickup-notice" className="text-base">
                Huomasitko kamoissa jotain?
              </Label>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Tarkista ennen lainan vahvistamista, että kaikki kamat ovat kunnossa, ja kirjaa
                puutteet tähän (esim. puuttuvat kiilat, reikä laavussa). Ylläpito käy huomiot läpi.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-destructive">
                <CircleAlert className="mr-2 inline h-4 w-4" />
                Voit joutua korvausvastuuseen, mikäli et kirjaa etukäteen kamoissa havaitsemiasi
                puutteita tai vahinkoja.
              </p>
              <Textarea
                id="pickup-notice"
                placeholder="Esim. laavun kulmassa pieni reikä"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-3 min-h-[100px] text-sm"
              />
            </Card>
          )}
        </div>

        <DrawerFooter className="border-t">
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Sulje
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={
                cart.items.length === 0 ||
                overBooked.size > 0 ||
                !isDescriptionValid ||
                !cart.loaner?.trim() ||
                (!isKiosk && !cart.userId)
              }
            >
              Lainaa
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
