'use client';

import { useRef, useState, useEffect } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';
import { IoMdAlert } from 'react-icons/io';
import { useSession } from 'next-auth/react';
import SubmitConfirmation from './SubmitConfirmation';
import LoanerAutocomplete from './LoanerAutocomplete';
import { Skeleton } from '@/components/ui/skeleton';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
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
import { formatDateNumeric } from '@/utils/dateFormat';
import { cn } from '@/lib/utils';

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

export default function CartDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const firstField = useRef<HTMLInputElement>(null);
  const { data: session } = useSession();
  const {
    state: cart,
    incrementAmount,
    decrementAmount,
    setDescription,
    setLoaner,
    setUserId,
  } = useCart();
  const cartItems = cart.items;
  const { state: dates } = useDates();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const startTime = dates.startDate;
  const endTime = dates.endDate;

  const StartDate = dates.startDate;
  const EndDate = dates.endDate;

  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const showLoading = useDelayedLoading(loading);

  const isAdmin = session?.user?.group === 'ADMIN';
  const isKiosk = session?.user?.group === 'KIOSK';

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

  useEffect(() => {
    if (!isKiosk && session?.user && !hasInitializedLoaner.current) {
      const userDisplayName = session.user.email || session.user.name || '';
      setLoaner(userDisplayName);
      setUserId(session.user.id);
      hasInitializedLoaner.current = true;
    }
  }, [isKiosk, session, setLoaner, setUserId]);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect -- intentional loading state before async fetch

    fetch('/api/availability/getAvailabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ StartDate, EndDate }),
    })
      .then((response) => response.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, [StartDate, EndDate]);

  function getCartAmount(id: string): number {
    return cartItems.find((cartItem: { id: string; amount: number }) => cartItem.id === id) !==
      undefined
      ? cartItems.find((cartItem: { id: string; amount: number }) => cartItem.id === id)!.amount
      : 0;
  }

  if (loading || !data) {
    if (!showLoading) {
      return null;
    }
    return (
      <Drawer open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
        <DrawerContent side="right" className="flex max-h-dvh flex-col">
          <DrawerHeader>
            <DrawerTitle>Ostoskori</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 space-y-4 overflow-auto p-6">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
            {Array.from({ length: Math.max(cartItems.length, 3) }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  const { availabilities } = data;

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
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DrawerHeader>
          <DrawerTitle>Ostoskori</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto p-6">
          <SubmitConfirmation
            isOpen={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            closeDrawer={onClose}
            reportContent={reportContent}
            setReportContent={setReportContent}
          />
          <div className="space-y-1">
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
            <div>
              <Label htmlFor="description">
                Kuvaus <span className="text-destructive">*</span>
              </Label>
              <Input
                ref={firstField}
                id="description"
                name="description"
                placeholder="Kuvaus (pakollinen)"
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
              <Label htmlFor="startTime">Lainaus alkaa</Label>
              <Input id="startTime" value={formatDateNumeric(startTime)} readOnly />
            </div>
            <div>
              <Label htmlFor="endTime">Lainaus loppuu</Label>
              <Input id="endTime" value={formatDateNumeric(endTime)} readOnly />
            </div>
          </div>

          <div className="mt-4 text-sm">
            <span className="text-destructive">*</span> Pakollinen kenttä
          </div>
          {isKiosk && (
            <div className="mt-6 rounded-lg border-2 bg-muted p-4">
              <p className="text-base leading-relaxed">
                Tarkista ennen lainan vahvistamista, että kaikki kamat ovat kunnossa ja mahdolliset
                vahingot on raportoitu alla olevaan kenttään. (Esim. puuttuvat kiilat, reikä
                laavussa tms.)
              </p>
              <p className="mt-2 text-base leading-relaxed text-destructive">
                <IoMdAlert className="mr-2 inline" />
                Huomio: Voit joutua korvausvastuuseen, mikäli et ole raportoinut etukäteen kamoissa
                havaitsemiasi puutteita tai vahinkoja.
              </p>
              <Textarea
                placeholder="Kirjoita raportti tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-3 min-h-[100px] text-sm"
              />
            </div>
          )}
          {cart.items.length > 0 ? (
            <div className="mt-5 space-y-2">
              <h3 className="text-base font-semibold">Valitut tavarat</h3>
              {cart.items.map((item) => {
                if (item.amount <= 0) return null;
                const isCustomItem = item.id.startsWith('custom-');
                const isIncrementDisabled = isCustomItem
                  ? false
                  : !availabilities[item.id] ||
                    getCartAmount(item.id) >= availabilities[item.id].available;

                return (
                  <div key={item.id}>
                    <Label htmlFor={`item-${item.id}`}>{item.name}</Label>
                    <div className="flex">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="decrement"
                        onClick={() => decrementAmount(item.id)}
                        className="rounded-r-none"
                      >
                        <FaMinus />
                      </Button>
                      <Input
                        id={`item-${item.id}`}
                        value={item.amount}
                        readOnly
                        className="pointer-events-none select-none rounded-none border-x-0 text-center font-bold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="increment"
                        onClick={() => incrementAmount(item.id)}
                        disabled={isIncrementDisabled}
                        className="rounded-l-none"
                      >
                        <FaPlus />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-muted-foreground">
              <p className="text-lg">Ostoskori on tyhjä</p>
              <p className="mt-2 text-sm">Lisää tavaroita ostoskoriin aloittaaksesi lainauksen</p>
            </div>
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
