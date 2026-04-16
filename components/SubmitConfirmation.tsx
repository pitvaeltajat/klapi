'use client';

import React from 'react';
import { CartItem } from '../types';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { IoMdAlert } from 'react-icons/io';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface InBoxItem {
  itemId: string;
  itemName: string;
}

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
  const [inBoxItems, setInBoxItems] = React.useState<InBoxItem[]>([]);
  const [isCheckingBox, setIsCheckingBox] = React.useState(false);

  React.useEffect(() => {
    const checkInBoxItems = async () => {
      if (!isOpen || cart.items.length === 0) {
        setInBoxItems([]);
        return;
      }

      setIsCheckingBox(true);
      try {
        const itemIds = cart.items
          .filter((item) => !item.id.startsWith('custom-'))
          .map((item) => item.id);

        if (itemIds.length === 0) {
          setInBoxItems([]);
          return;
        }

        const response = await fetch('/api/reservation/checkInBox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemIds }),
        });

        if (response.ok) {
          const data = await response.json();
          setInBoxItems(data.inBoxItems || []);
        }
      } catch (error) {
        console.error('Failed to check in-box items:', error);
      } finally {
        setIsCheckingBox(false);
      }
    };

    checkInBoxItems();
  }, [isOpen, cart.items]);

  const handleSubmit = async () => {
    setIsLoading(true);
    const startTime = dates.startDate;
    const endTime = dates.endDate;

    const userId = cart.userId || session?.user?.id;

    const reservations = cart.items.map((cartitem: CartItem) => ({
      itemId: cartitem.id,
      amount: cartitem.amount,
      ...(cartitem.id.startsWith('custom-') ? { name: cartitem.name } : {}),
    }));

    const body = {
      reservations,
      startTime,
      endTime,
      userId,
      description: cart.description,
      loaner: cart.loaner,
    };

    const response = await fetch('/api/loan/submitLoan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const responseData = await response.json();

    if (response.ok) {
      if (reportContent && reportContent.trim().length > 0) {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: reportContent,
            loanId: responseData.id,
            created: 'BEFORE_LOAN',
          }),
        });
      }

      setReportContent('');
      clearCart();
      toast.success('Varaus lähetetty', {
        description: 'Varaus rekisteröitiin onnistuneesti.',
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
      toast.error('Error', { description: 'Varauksen lähetyksessä tapahtui virhe' });
    }

    onClose();
    closeDrawer();
    setIsLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarkista varauksen tiedot:</DialogTitle>
        </DialogHeader>
        <div>
          {inBoxItems.length > 0 && (
            <div className="mb-4 flex items-start gap-3 rounded-md border border-warning/50 bg-warning/10 p-4">
              <IoMdAlert className="mt-0.5 h-5 w-5 text-warning" />
              <div>
                <div className="font-semibold">Huomio: Kamoja laatikossa</div>
                <p className="text-sm text-muted-foreground">
                  Jotkin näistä kamoista ovat laatikossa edellisen lainauksen jäljiltä. Otat täyden
                  vastuun tarkistaa kamojen kunnon noudettaessa.
                </p>
              </div>
            </div>
          )}

          <p>
            <b>Lainaaja: </b>
            {cart.loaner || session?.user?.name || session?.user?.email || 'Ei määritelty'}
            <br />
            <br />
            <b>Kamojen nouto: </b>
            {dates.startDate.toLocaleString('fi', {
              day: 'numeric',
              year: 'numeric',
              month: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            <br />
            <b>Kamojen palautus: </b>
            {dates.endDate.toLocaleString('fi', {
              day: 'numeric',
              year: 'numeric',
              month: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-4">Varattavat kamat:</p>

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
          <Button variant="success" onClick={handleSubmit} isLoading={isLoading || isCheckingBox}>
            Lähetä varaus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
