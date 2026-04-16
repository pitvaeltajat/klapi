'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loan, User, Reservation, Item } from '@prisma/client';
import { toast } from 'sonner';
import { IoMdAlert } from 'react-icons/io';
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

interface LoanWithRelations extends Loan {
  user: User;
  reservations: (Reservation & {
    item: Item;
  })[];
}

export default function StartLoanConfirmation({
  isOpen,
  onClose,
  loan,
}: {
  isOpen: boolean;
  onClose: () => void;
  loan: LoanWithRelations;
}) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [inBoxItems, setInBoxItems] = useState<InBoxItem[]>([]);
  const [isCheckingBox, setIsCheckingBox] = useState(false);

  useEffect(() => {
    const checkInBoxItems = async () => {
      if (!isOpen || loan.reservations.length === 0) {
        setInBoxItems([]);
        return;
      }

      setIsCheckingBox(true);
      try {
        const itemIds = loan.reservations
          .filter((res) => !res.itemId.startsWith('custom-'))
          .map((res) => res.itemId);

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
  }, [isOpen, loan.reservations]);

  const handleStartLoan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/loan/startLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loan.id }),
      });

      if (response.ok) {
        toast.success('Lainaus aloitettu', {
          description: 'Lainaus on nyt käynnissä. Muista palauttaa kamat ajoissa!',
        });
        router.reload();
      } else {
        const error = await response.json();
        toast.error('Virhe', {
          description: error.message || 'Lainauksen aloituksessa tapahtui virhe',
        });
      }
    } catch {
      toast.error('Virhe', { description: 'Lainauksen aloituksessa tapahtui virhe' });
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => (!o ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aloita lainaus</DialogTitle>
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

          <p className="mb-2">
            <b>Lainaaja: </b>
            {loan.loaner || loan.user.name || loan.user.email}
          </p>
          <p className="mb-2">
            <b>Palautus: </b>
            {new Date(loan.endTime).toLocaleString('fi', {
              day: 'numeric',
              month: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>

          <p className="mb-2 mt-4 font-bold">Lainattavat kamat:</p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kama</TableHead>
                <TableHead className="text-right">Määrä</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.reservations.map((reservation) => (
                <TableRow key={reservation.id}>
                  <TableCell>{reservation.item.name}</TableCell>
                  <TableCell className="text-right">{reservation.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Peruuta
          </Button>
          <Button variant="success" onClick={handleStartLoan} isLoading={isLoading || isCheckingBox}>
            Aloita lainaus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
