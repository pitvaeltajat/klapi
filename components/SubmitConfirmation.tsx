'use client';

import React from 'react';
import { CartItem } from '../types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCart } from '@/contexts/CartContext';
import { useDates } from '@/contexts/DatesContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { DateTime } from '@/components/DateTime';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useInBoxItems } from '@/hooks/useInBoxItems';
import { isCustomItemId } from '@/utils/customItems';

export default function SubmitConfirmation({
  isOpen,
  onClose,
  closeDrawer,
  setReportContent,
  reportContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  closeDrawer: () => void;
  setReportContent: React.Dispatch<React.SetStateAction<string>>;
  reportContent?: string;
}) {
  const { state: dates, setDatesSet } = useDates();
  const { state: cart, clearCart, resetCart } = useCart();
  const router = useRouter();

  const { data: session } = useSession();

  const [isLoading, setIsLoading] = React.useState(false);

  const itemIds = React.useMemo(() => cart.items.map((item) => item.id), [cart.items]);
  const { inBoxItems, isChecking } = useInBoxItems(itemIds, isOpen);

  const handleSubmit = async () => {
    setIsLoading(true);
    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const userId = cart.userId || session?.user?.id;

    const reservations = cart.items.map((cartitem: CartItem) => ({
      itemId: cartitem.id,
      amount: cartitem.amount,
      ...(isCustomItemId(cartitem.id) ? { name: cartitem.name } : {}),
    }));

    const body = {
      reservations,
      startTime,
      endTime,
      userId,
      description: cart.description,
      loaner: cart.loaner,
      reportContent: reportContent ?? '',
    };

    const response = await fetch('/api/loan/submitLoan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      setReportContent('');
      clearCart();
      toast.success('Laina lähetetty', {
        description: reportContent?.trim()
          ? 'Laina rekisteröitiin ja huomiosi kirjattiin.'
          : 'Laina rekisteröitiin onnistuneesti.',
        duration: 9000,
      });
      if (session?.user?.group === 'KIOSK') {
        resetCart();
        setDatesSet(false);
        router.push('/');
      } else {
        router.push('/account');
      }
    } else {
      toast.error('Error', { description: 'Lainan lähetyksessä tapahtui virhe' });
    }

    onClose();
    closeDrawer();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarkista lainan tiedot:</DialogTitle>
        </DialogHeader>
        <div>
          {inBoxItems.length > 0 && (
            <Alert variant="warning" title="Kamoja on vielä laatikossa" className="mb-4">
              Jotkin näistä kamoista ovat laatikossa edellisen lainauksen jäljiltä. Otat täyden
              vastuun tarkistaa kamojen kunnon noudettaessa.
            </Alert>
          )}

          <p>
            <b>Lainaaja: </b>
            {cart.loaner || session?.user?.name || session?.user?.email || 'Ei määritelty'}
            <br />
            <br />
            <b>Kamojen nouto: </b>
            <DateTime value={dates.startDate} format="numeric" />
            <br />
            <b>Kamojen palautus: </b>
            <DateTime value={dates.endDate} format="numeric" />
          </p>
          <p className="mt-4">Lainattavat kamat:</p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kama</TableHead>
                <TableHead className="text-right">Määrä</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.items.map((cartItem) => (
                <TableRow key={cartItem.id}>
                  <TableCell>{cartItem.name}</TableCell>
                  <TableCell className="text-right">{cartItem.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Peruuta
          </Button>
          <Button variant="success" onClick={handleSubmit} isLoading={isLoading || isChecking}>
            Lähetä laina
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
