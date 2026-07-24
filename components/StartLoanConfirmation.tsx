'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loan, User, Reservation, Item } from '@prisma/client';
import { toast } from 'sonner';
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
import { Alert } from '@/components/ui/alert';
import { DateTime } from '@/components/DateTime';
import { useInBoxItems } from '@/hooks/useInBoxItems';

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

  const itemIds = useMemo(
    () => loan.reservations.map((res) => res.itemId),
    [loan.reservations],
  );
  const { inBoxItems, isChecking } = useInBoxItems(itemIds, isOpen);

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
        router.refresh();
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
            <Alert variant="warning" title="Huomio: Kamoja laatikossa" className="mb-4">
              Jotkin näistä kamoista ovat laatikossa edellisen lainauksen jäljiltä. Otat täyden
              vastuun tarkistaa kamojen kunnon noudettaessa.
            </Alert>
          )}

          <p className="mb-2">
            <b>Lainaaja: </b>
            {loan.loaner || loan.user.name || loan.user.email}
          </p>
          <p className="mb-2">
            <b>Palautus: </b>
            <DateTime value={loan.endTime} format="numeric" />
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
          <Button variant="success" onClick={handleStartLoan} isLoading={isLoading || isChecking}>
            Aloita lainaus
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
