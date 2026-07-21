'use client';

import React, { useState, useEffect } from 'react';
import { FaMinus, FaPlus, FaTrash } from 'react-icons/fa';
import { IoMdAlert } from 'react-icons/io';
import { useSession } from 'next-auth/react';
import { Item, LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import { formatDateOnly } from '@/utils/dateFormat';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
  };
}

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date | string;
  endTime: Date | string;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: Reservation[];
}

interface AvailabilityData {
  availabilities: Record<string, { available: number }>;
}

const EditItemsDialog = ({
  onOpenChange,
  loan,
  items,
  onSaved,
}: {
  onOpenChange: (open: boolean) => void;
  loan: LoanType;
  items: Item[];
  onSaved: (next: Reservation[]) => void;
}) => {
  const [reservations, setReservations] = useState<Reservation[]>(loan.reservations);
  const [selectedItem, setSelectedItem] = useState(items[0]?.id || '');
  const [selectedItemAmount, setSelectedItemAmount] = useState(0);
  const [availabilityData, setAvailabilityData] = useState<AvailabilityData | null>(null);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/availability/getAvailabilities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        StartDate: new Date(loan.startTime),
        EndDate: new Date(loan.endTime),
      }),
    })
      .then((r) => r.json())
      .then((data) => setAvailabilityData(data))
      .catch((e) => console.error('Failed to fetch availability:', e))
      .finally(() => setLoadingAvailability(false));
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

  const getMaxForReservation = (reservation: Reservation): number => {
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

  const isNewReservation = (reservation: Reservation) =>
    !loan.reservations.find((r) => r.id === reservation.id);

  const isReservationModified = (reservation: Reservation) => {
    const original = loan.reservations.find((r) => r.id === reservation.id);
    if (!original) return true;
    return reservation.amount !== original.amount;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/loan/updateLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loan.id,
          description: loan.description,
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
        const description =
          (data.details && Array.isArray(data.details) ? data.details.join('\n') : null) ||
          data.message ||
          'Virhe tallennettaessa';
        toast.error(data.message || 'Virhe', { description });
        return;
      }
      toast.success('Varaus päivitetty');
      onSaved(reservations);
      onOpenChange(false);
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe — yritä uudelleen' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Muokkaa lainan kamoja</DialogTitle>
        </DialogHeader>

        {loadingAvailability ? (
          <div className="flex flex-col gap-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="ml-auto h-10 w-32" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {reservations.length === 0 ? (
                <p className="italic text-muted-foreground">Ei kamoja</p>
              ) : (
                reservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className={cn(
                      'rounded-md border p-3',
                      isNewReservation(reservation)
                        ? 'border-success bg-success/10'
                        : isReservationModified(reservation)
                          ? 'border-warning'
                          : 'border-border',
                    )}
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
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
                              setReservations((rs) =>
                                rs.map((r) =>
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
                          className="h-9 w-14 text-center"
                        />
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label="Lisää määrää"
                          onClick={() => {
                            setReservations((rs) =>
                              rs.map((r) =>
                                r.id === reservation.id ? { ...r, amount: r.amount + 1 } : r,
                              ),
                            );
                          }}
                          disabled={reservation.amount >= getMaxForReservation(reservation)}
                        >
                          <FaPlus />
                        </Button>
                        <Button
                          aria-label="Poista varaus"
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setReservations((rs) => rs.filter((r) => r.id !== reservation.id));
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

            <div className="rounded-md border bg-muted/40 p-3">
              <p className="mb-2 font-semibold">Lisää kama</p>
              <div className="flex flex-col gap-2 md:flex-row md:items-end">
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
                <Button
                  onClick={() => {
                    const selectedItemObj = items.find((i) => i.id === selectedItem);
                    if (!selectedItemObj) return;
                    const existingStatus =
                      loan.reservations[0]?.status || ReservationStatus.ACCEPTED;
                    setReservations((rs) => [
                      ...rs,
                      {
                        id: `new-${Math.random().toString(36).slice(2)}`,
                        amount: selectedItemAmount,
                        status: existingStatus,
                        item: { id: selectedItemObj.id, name: selectedItemObj.name },
                      },
                    ]);
                    setSelectedItemAmount(0);
                  }}
                  disabled={selectedItemAmount === 0}
                >
                  Lisää
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Peruuta
          </Button>
          <Button variant="success" onClick={handleSave} isLoading={saving}>
            Tallenna muutokset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LoanStartCard = ({
  loan: initialLoan,
  items,
  onStart,
  onStartComplete,
}: {
  loan: LoanType;
  items: Item[];
  onStart: (id: string, reportContent: string) => Promise<void>;
  onStartComplete: () => void;
}) => {
  const [loan, setLoan] = useState<LoanType>(initialLoan);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
  const acceptedReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.ACCEPTED,
  );

  const handleStartLoan = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await onStart(loan.id, reportContent);
      setOpen(false);
      onStartComplete();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-lg border p-4">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{loan.description || loan.loaner}</h3>
          <Badge variant={getLoanStatusColor(derivedStatus)} className="w-fit">
            {getLoanStatusLabel(derivedStatus)}
          </Badge>
          <p>Lainaaja: {loan.loaner}</p>
          <p>
            Laina-aika: {formatDateOnly(loan.startTime)} -{' '}
            {formatDateOnly(loan.endTime)}
          </p>
          <div>
            <p className="mb-2 font-bold">Tavarat:</p>
            <div className="flex flex-wrap gap-2">
              {acceptedReservations.map((reservation) => (
                <Badge key={reservation.id} className="rounded-full">
                  {reservation.item.name} ({reservation.amount})
                </Badge>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
            <p className="font-semibold text-primary">Tarvitseeko kamoihin muutoksia?</p>
            <p className="mt-1 text-foreground/90">
              Voit lisätä, poistaa tai muuttaa määriä ennen lainauksen aloitusta.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setEditOpen(true)}
            >
              Muokkaa kamoja
            </Button>
          </div>
          <Button variant="success" size="lg" onClick={() => setOpen(true)}>
            Aloita lainaus
          </Button>
        </div>
      </div>

      {editOpen && (
        <EditItemsDialog
          onOpenChange={setEditOpen}
          loan={loan}
          items={items}
          onSaved={(nextReservations) => {
            setLoan((prev) => ({ ...prev, reservations: nextReservations }));
          }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hyväksy lainauksen aloitus</DialogTitle>
          </DialogHeader>
          <div>
            <p className="mb-4">
              Vahvistamalla lainauksen aloituksen otat vastuullesi lainattavat tavarat.
            </p>
            <div className="mb-4 rounded-md border border-primary/30 bg-primary/10 p-3">
              <p className="font-bold leading-relaxed text-primary">
                💡 Vinkki: Ota kuva kamoista puhelimellasi
              </p>
              <p className="mt-1 leading-relaxed">
                Suosittelemme ottamaan kuvan kamoista ennen lainauksen aloitusta. Jos palautuksessa
                tulee hämminkiä, kuva puhelimessasi toimii omana todisteenasi. Kuvaa ei tarvitse
                lähettää mihinkään — säilytä se omassa puhelimessasi.
              </p>
            </div>
            <div className="mb-4 rounded-md border bg-muted p-3">
              <p className="leading-relaxed">
                Tarkista ennen lainan vahvistamista, että kaikki kamat ovat kunnossa ja
                mahdolliset vahingot on raportoitu alla olevaan kenttään. (Esim. puuttuvat kiilat,
                reikä laavussa tms.)
              </p>
              <p className="mt-2 leading-relaxed text-destructive">
                <IoMdAlert className="mr-2 inline" />
                Huomio: Voit joutua korvausvastuuseen, mikäli et ole raportoinut etukäteen kamoissa
                havaitsemiasi puutteita tai vahinkoja.
              </p>
              <Textarea
                placeholder="Kirjoita puutteet tai huomiot tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-2 min-h-[100px] text-sm"
              />
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              Ymmärrän ja hyväksyn vastuuni lainattavista tavaroista.
            </label>
          </div>
          <DialogFooter>
            <Button variant="success" onClick={handleStartLoan} disabled={!termsAccepted} isLoading={isLoading}>
              Aloita lainaus
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Peruuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function StartLoanView({ loans, items }: { loans: LoanType[]; items: Item[] }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleStart = async (loanId: string, reportContent: string) => {
    try {
      const response = await fetch('/api/loan/startLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, reportContent }),
      });
      if (response.ok) {
        toast.success('Lainaus aloitettu!');
      } else {
        throw new Error('Lainauksen aloitus epäonnistui');
      }
    } catch {
      toast.error('Virhe', { description: 'Lainauksen aloitus epäonnistui. Yritä uudelleen.' });
    }
  };

  const handleStartComplete = () => {
    router.push('/');
  };

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Aloita lainaus' }]} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="mb-4 text-3xl font-semibold">Aloita lainaus</h1>
          {loans.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Ei aloitettavia lainoja
              </h2>
              <Button size="lg" onClick={() => router.push('/')}>
                Takaisin alkuun
              </Button>
            </div>
          ) : (
            <>
              {loans.map((loan) => (
                <LoanStartCard
                  key={loan.id}
                  loan={loan}
                  items={items}
                  onStart={handleStart}
                  onStartComplete={handleStartComplete}
                />
              ))}
              {/* The kiosk browser has no back button — always leave a way out. */}
              <div className="mt-6 flex justify-center">
                <Button variant="outline" size="lg" onClick={() => router.push('/')}>
                  Takaisin alkuun
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
