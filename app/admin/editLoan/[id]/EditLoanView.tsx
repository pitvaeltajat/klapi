'use client';

import React, { useState, useEffect } from 'react';
import { FaMinus, FaPlus, FaTrash, FaHistory } from 'react-icons/fa';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import NotAuthenticated from '@/components/NotAuthenticated';
import LoadingSpinner from '@/components/LoadingSpinner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Loan, Item, User, Reservation, ReservationStatus, LoanStatus } from '@prisma/client';
import { deriveLoanStatus } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NumberInput } from '@/components/ui/number-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

interface LoanWithRelations extends Loan {
  reservations: (Reservation & { item: Item })[];
  user: User;
}

export default function EditLoanView({ loan, items }: { loan: LoanWithRelations; items: Item[] }) {
  const [description, setDescription] = useState(loan.description);
  const [startDate, setStartDate] = useState(loan.startTime.toString().split('.')[0]);
  const [endDate, setEndDate] = useState(loan.endTime.toString().split('.')[0]);
  const [selectedItem, setSelectedItem] = useState(items[0]?.id || '');
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);
  const [reservations, setReservations] = useState(loan.reservations);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: session } = useSession();
  const router = useRouter();

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const response = await fetch('/api/availability/getAvailabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            StartDate: new Date(startDate),
            EndDate: new Date(endDate),
          }),
        });
        const data = await response.json();
        setAvailabilityData(data);
      } catch (error) {
        console.error('Failed to fetch availability:', error);
      }
      setLoadingAvailability(false);
    };
    fetchAvailability();
  }, [startDate, endDate]);

  const getEffectiveAvailability = (itemId: string): number => {
    if (!availabilityData?.availabilities?.[itemId]) return 0;
    const baseAvailability = availabilityData.availabilities[itemId].available;
    const originalReservation = loan.reservations.find((r) => r.item.id === itemId);
    const originalAmount = originalReservation?.amount ?? 0;
    return baseAvailability + originalAmount;
  };

  const getCurrentReservationAmount = (itemId: string): number =>
    reservations.filter((r) => r.item.id === itemId).reduce((sum, r) => sum + r.amount, 0);

  const getMaxForReservation = (reservation: (typeof reservations)[0]): number => {
    const effectiveAvail = getEffectiveAvailability(reservation.item.id);
    const currentInOtherRows = reservations
      .filter((r) => r.item.id === reservation.item.id && r.id !== reservation.id)
      .reduce((sum, r) => sum + r.amount, 0);
    return Math.max(0, effectiveAvail - currentInOtherRows);
  };

  const getMaxForNewItem = (itemId: string): number => {
    const effectiveAvail = getEffectiveAvailability(itemId);
    const currentTotal = getCurrentReservationAmount(itemId);
    return Math.max(0, effectiveAvail - currentTotal);
  };

  const isAdmin = session?.user?.group === 'ADMIN';
  const isOwner = session?.user?.id === loan.user.id;

  const derivedStatus = deriveLoanStatus(
    loan.reservations.map((r) => ({ status: r.status as ReservationStatus })),
    loan.status as LoanStatus,
  );
  const statusAllowsEdit =
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'IN_BOX' &&
    derivedStatus !== 'PARTIALLY_RETURNED' &&
    derivedStatus !== 'RETURNED';

  if (!session?.user || (!isAdmin && !isOwner)) return <NotAuthenticated />;
  if (!isAdmin && !statusAllowsEdit) return <NotAuthenticated />;

  async function updateLoan() {
    try {
      const response = await fetch(`/api/loan/updateLoan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loan.id,
          description,
          startTime: new Date(startDate),
          endTime: new Date(endDate),
          reservations: reservations.map((r) => ({
            amount: r.amount,
            item: { connect: { id: r.item.id } },
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorDescription = data.message || 'Joku meni vituiks';
        if (data.details && Array.isArray(data.details)) {
          errorDescription = data.details.join('\n');
        }
        toast.error(data.message || 'Virhe', { description: errorDescription });
        setConfirmOpen(false);
        return;
      }

      toast.success('Laina päivitetty', { description: 'Laina päivitetty onnistuneesti' });
      setConfirmOpen(false);
      router.push('/loan');
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe - yritä uudelleen' });
      setConfirmOpen(false);
    }
  }

  const isDescriptionModified = description !== loan.description;
  const isStartDateModified = startDate !== loan.startTime.toString().split('.')[0];
  const isEndDateModified = endDate !== loan.endTime.toString().split('.')[0];

  const isReservationModified = (reservation: (typeof reservations)[0]) => {
    const original = loan.reservations.find((r) => r.id === reservation.id);
    if (!original) return true;
    return reservation.amount !== original.amount;
  };

  const isNewReservation = (reservation: (typeof reservations)[0]) =>
    !loan.reservations.find((r) => r.id === reservation.id);

  if (loadingAvailability) {
    return <LoadingSpinner />;
  }

  const dirty = (modified: boolean) => (modified ? 'border-2 border-warning' : '');

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Lainat', href: '/loan' },
          { label: loan.description || 'Ei kuvausta', href: `/loan/${loan.id}` },
          { label: 'Muokkaa' },
        ]}
      />
      <div className="flex flex-col gap-6">
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Päivitä Laina</DialogTitle>
            </DialogHeader>
            <p>
              Oletko täysin varma? Systeemi voi mennä ihan vitun solmuun, jos tiedot ei ole kunnolla
              tarkistettuja.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Peruuta
              </Button>
              <Button variant="success" onClick={() => updateLoan()}>
                Vahvista
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <h1 className="text-4xl font-semibold">Muokkaa lainaa</h1>

        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-xl font-semibold">Perustiedot</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lainan ID</p>
              <p className="font-mono text-sm">{loan.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lainaaja</p>
              <p className="font-medium">{loan.loaner || loan.user.name || loan.user.email}</p>
              {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
                <p className="text-sm text-muted-foreground">
                  Tili: {loan.user.name} ({loan.user.email})
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">Kuvaus</h2>
              {isDescriptionModified && <Badge variant="warning">Muokattu</Badge>}
            </div>
            <Button
              aria-label="Palauta alkuperäinen"
              size="icon-sm"
              variant="ghost"
              onClick={() => setDescription(loan.description)}
              disabled={!isDescriptionModified}
            >
              <FaHistory />
            </Button>
          </div>
          <Textarea
            className={cn(dirty(isDescriptionModified))}
            value={description ?? ''}
            placeholder="Ei kuvausta"
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-xl font-semibold">Päivämäärät</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Aloitus</Label>
                  {isStartDateModified && <Badge variant="warning">Muokattu</Badge>}
                </div>
                <Button
                  aria-label="Palauta alkuperäinen"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setStartDate(loan.startTime.toString().split('.')[0])}
                  disabled={!isStartDateModified}
                >
                  <FaHistory />
                </Button>
              </div>
              <Input
                className={cn(dirty(isStartDateModified))}
                onChange={(e) => setStartDate(e.target.value)}
                type="datetime-local"
                value={startDate}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Lopetus</Label>
                  {isEndDateModified && <Badge variant="warning">Muokattu</Badge>}
                </div>
                <Button
                  aria-label="Palauta alkuperäinen"
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEndDate(loan.endTime.toString().split('.')[0])}
                  disabled={!isEndDateModified}
                >
                  <FaHistory />
                </Button>
              </div>
              <Input
                className={cn(dirty(isEndDateModified))}
                onChange={(e) => setEndDate(e.target.value)}
                type="datetime-local"
                value={endDate}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Lainaukset</h2>
            <Button
              aria-label="Palauta kaikki lainaukset"
              size="icon-sm"
              variant="ghost"
              onClick={() => setReservations(loan.reservations)}
            >
              <FaHistory />
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {reservations.length === 0 ? (
              <p className="italic text-muted-foreground">Ei lainauksia</p>
            ) : (
              reservations.map((reservation) => (
                <div
                  key={reservation.id}
                  className={cn(
                    'rounded-md border p-4',
                    isNewReservation(reservation)
                      ? 'border-success bg-success/10'
                      : isReservationModified(reservation)
                        ? 'border-warning'
                        : 'border-border',
                  )}
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <p className="font-medium">{reservation.item.name}</p>
                      <Badge variant="gray">max: {getMaxForReservation(reservation)}</Badge>
                      {isNewReservation(reservation) && <Badge variant="success">Uusi</Badge>}
                      {!isNewReservation(reservation) && isReservationModified(reservation) && (
                        <Badge variant="warning">Muokattu</Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label="Vähennä määrää"
                        onClick={() => {
                          if (reservation.amount > 1) {
                            setReservations(
                              reservations.map((r) =>
                                r.id === reservation.id ? { ...r, amount: r.amount - 1 } : r,
                              ),
                            );
                          }
                        }}
                        disabled={reservation.amount <= 1}
                      >
                        <FaMinus />
                      </Button>
                      <Input
                        value={reservation.amount}
                        readOnly
                        className="h-9 w-16 text-center"
                      />
                      <Button
                        size="icon-sm"
                        variant="outline"
                        aria-label="Lisää määrää"
                        onClick={() => {
                          setReservations(
                            reservations.map((r) =>
                              r.id === reservation.id ? { ...r, amount: r.amount + 1 } : r,
                            ),
                          );
                        }}
                        disabled={reservation.amount >= getMaxForReservation(reservation)}
                      >
                        <FaPlus />
                      </Button>
                      <Button
                        aria-label="Poista laina"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setReservations(reservations.filter((r) => r.id !== reservation.id));
                        }}
                      >
                        <FaTrash />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <h2 className="mb-4 text-xl font-semibold">Lisää kama</h2>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-2">
              <Label>Kama</Label>
              <select
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  setSelectedItemAmount(0);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <Label>Määrä (vapaana: {getMaxForNewItem(selectedItem)})</Label>
              <NumberInput
                value={selectedItemAmount}
                onChange={setSelectedItemAmount}
                min={0}
                max={getMaxForNewItem(selectedItem)}
              />
            </div>

            <div className="self-stretch md:self-end">
              <Button
                onClick={() => {
                  const newReservations = [...reservations];
                  const selectedItemObj = items.find((i) => i.id === selectedItem);
                  if (!selectedItemObj) return;
                  const existingStatus = loan.reservations[0]?.status || ReservationStatus.ACCEPTED;
                  newReservations.push({
                    id: Math.random().toString(),
                    amount: selectedItemAmount,
                    itemId: selectedItem,
                    loanId: loan.id,
                    status: existingStatus,
                    item: selectedItemObj,
                  });
                  setReservations(newReservations);
                  setSelectedItemAmount(0);
                }}
                disabled={selectedItemAmount === 0}
                className="w-full md:w-auto"
              >
                Lisää
              </Button>
            </div>
          </div>
        </div>

        <Button
          variant="success"
          size="lg"
          onClick={() => setConfirmOpen(true)}
          className="w-full md:w-auto"
        >
          Tallenna muutokset
        </Button>
      </div>
    </>
  );
}
