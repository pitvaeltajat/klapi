'use client';

import React, { useState, useEffect } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Loan, Item, User, Reservation, ReservationStatus } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { NumberInput } from '@/components/ui/number-input';
import { DateTime } from '@/components/DateTime';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

interface LoanWithRelations extends Loan {
  reservations: (Reservation & { item: Item })[];
  user: User;
}

export default function UserEditLoanView({
  loan,
  items,
}: {
  loan: LoanWithRelations;
  items: Item[];
}) {
  const [description, setDescription] = useState(loan.description);
  const [selectedItem, setSelectedItem] = useState(items[0]?.id || '');
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);
  const [reservations, setReservations] = useState(loan.reservations);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAvailability = async () => {
      setLoadingAvailability(true);
      try {
        const response = await fetch('/api/availability/getAvailabilities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            StartDate: new Date(loan.startTime),
            EndDate: new Date(loan.endTime),
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
  }, [loan.startTime, loan.endTime]);

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

  const isNewReservation = (reservation: (typeof reservations)[0]) =>
    !loan.reservations.find((r) => r.id === reservation.id);

  const isReservationModified = (reservation: (typeof reservations)[0]) => {
    const original = loan.reservations.find((r) => r.id === reservation.id);
    if (!original) return true;
    return reservation.amount !== original.amount;
  };

  async function updateLoan() {
    try {
      const response = await fetch('/api/loan/updateLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loan.id,
          description,
          startTime: loan.startTime,
          endTime: loan.endTime,
          reservations: reservations.map((r) => ({
            amount: r.amount,
            item: { connect: { id: r.item.id } },
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        let errorDescription = data.message || 'Virhe tallennettaessa';
        if (data.details && Array.isArray(data.details)) {
          errorDescription = data.details.join('\n');
        }
        toast.error(data.message || 'Virhe', { description: errorDescription });
        setConfirmOpen(false);
        return;
      }

      toast.success('Varaus päivitetty', { description: 'Varaus päivitetty onnistuneesti' });
      setConfirmOpen(false);
      router.push(`/loan/${loan.id}`);
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe — yritä uudelleen' });
      setConfirmOpen(false);
    }
  }

  if (loadingAvailability) {
    return (
      <>
        <Breadcrumbs
          items={[
            { label: 'Varaukset', href: '/loan' },
            { label: loan.description || 'Ei kuvausta', href: `/loan/${loan.id}` },
            { label: 'Muokkaa' },
          ]}
        />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-64" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="mb-4 h-6 w-40" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Varaukset', href: '/loan' },
          { label: loan.description || 'Ei kuvausta', href: `/loan/${loan.id}` },
          { label: 'Muokkaa' },
        ]}
      />
      <div className="flex flex-col gap-6">
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Tallenna muutokset"
          description="Tallennetaanko muutokset varaukseen?"
          confirmLabel="Tallenna"
          confirmVariant="success"
          onConfirm={updateLoan}
        />

        <PageHeader className="mb-0" title="Muokkaa varausta" />

        <Card>
          <CardTitle>Perustiedot</CardTitle>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Aloitusaika</p>
              <DateTime value={loan.startTime} format="long" className="font-medium" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lopetusaika</p>
              <DateTime value={loan.endTime} format="long" className="font-medium" />
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle>Kuvaus</CardTitle>
          <Label htmlFor="description">Kuvaus</Label>
          <Textarea
            id="description"
            value={description ?? ''}
            placeholder="Ei kuvausta"
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1"
          />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kamat</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setReservations(loan.reservations)}>
              Palauta alkuperäiset
            </Button>
          </CardHeader>

          <div className="flex flex-col gap-3">
            {reservations.length === 0 ? (
              <EmptyState variant="inline" title="Ei kalusteita" />
            ) : (
              reservations.map((reservation) => (
                <Card
                  key={reservation.id}
                  variant="inset"
                  padding="md"
                  className={cn(
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
                        <Minus className="h-4 w-4" />
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
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        aria-label="Poista varaus"
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setReservations(reservations.filter((r) => r.id !== reservation.id));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Lisää kama</CardTitle>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-2">
              <Label>Kama</Label>
              <NativeSelect
                value={selectedItem}
                onChange={(e) => {
                  setSelectedItem(e.target.value);
                  setSelectedItemAmount(0);
                }}
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </NativeSelect>
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
                  const selectedItemObj = items.find((i) => i.id === selectedItem);
                  if (!selectedItemObj) return;
                  const existingStatus =
                    loan.reservations[0]?.status || ReservationStatus.ACCEPTED;
                  setReservations([
                    ...reservations,
                    {
                      id: Math.random().toString(),
                      amount: selectedItemAmount,
                      itemId: selectedItem,
                      loanId: loan.id,
                      status: existingStatus,
                      item: selectedItemObj,
                    },
                  ]);
                  setSelectedItemAmount(0);
                }}
                disabled={selectedItemAmount === 0}
                className="w-full md:w-auto"
              >
                Lisää
              </Button>
            </div>
          </div>
        </Card>

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
