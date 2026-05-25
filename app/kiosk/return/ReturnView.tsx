'use client';

import React, { useState } from 'react';
import { IoMdAlert } from 'react-icons/io';
import { useSession } from 'next-auth/react';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '@/utils/loanHelpers';
import { useItemImage, usePlaceholder } from '@/hooks/useItemImage';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/utils/dateFormat';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
  };
}

function ReservationItemImage({ itemId, itemName }: { itemId: string; itemName: string }) {
  const imageSrc = useItemImage(itemId);
  const placeholder = usePlaceholder();
  const [err, setErr] = useState(false);
  return (
    /* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with onError fallback */
    <img
      src={err ? placeholder : imageSrc}
      alt={itemName}
      onError={() => setErr(true)}
      className="h-20 w-20 rounded-md object-cover"
    />
  );
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

const LoanReturnCard = ({
  loan,
  onReturn,
  onReturnComplete,
}: {
  loan: LoanType;
  onReturn: (
    id: string,
    reservationIds: string[],
    reportContent: string,
  ) => Promise<{ name: string; description: string | null } | null>;
  onReturnComplete: () => void;
}) => {
  const [returnOpen, setReturnOpen] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxInfo, setBoxInfo] = useState<{ name: string; description: string | null } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Returnable = items the borrower physically has. Normally INUSE, but also
  // ACCEPTED for "stuck" loans that were picked up without being marked in use.
  const returnableReservations = React.useMemo(
    () =>
      loan.reservations.filter(
        (r) =>
          r.status === ReservationStatus.INUSE || r.status === ReservationStatus.ACCEPTED,
      ),
    [loan.reservations],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(returnableReservations.map((r) => r.id)),
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = selectedIds.size === returnableReservations.length;
  const isPartialReturn =
    selectedIds.size > 0 && selectedIds.size < returnableReservations.length;

  const handleConfirmReturn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const box = await onReturn(loan.id, Array.from(selectedIds), reportContent);
      if (box) {
        setBoxInfo(box);
        setReturnOpen(false);
        setBoxOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBoxInstructionsClose = () => {
    setBoxOpen(false);
    onReturnComplete();
  };

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

  return (
    <>
      <div className="flex h-full flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-lg font-semibold">
            {loan.description || loan.loaner}
          </h3>
          <Badge variant={getLoanStatusColor(derivedStatus)} className="shrink-0">
            {getLoanStatusLabel(derivedStatus)}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium">Lainaaja:</span> {loan.loaner}
          </p>
          <p>
            <span className="font-medium">Laina-aika:</span> {formatDateOnly(loan.startTime)} –{' '}
            {formatDateOnly(loan.endTime)}
          </p>
        </div>

        {returnableReservations.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">
              Palautettavat tavarat ({returnableReservations.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {returnableReservations.slice(0, 5).map((reservation) => (
                <Badge key={reservation.id} variant="default">
                  {reservation.item.name} ({reservation.amount})
                </Badge>
              ))}
              {returnableReservations.length > 5 && (
                <Badge variant="gray">+{returnableReservations.length - 5} lisää</Badge>
              )}
            </div>
          </div>
        )}

        <Button
          variant="success"
          onClick={() => setReturnOpen(true)}
          className="mt-auto"
        >
          Palauta
        </Button>
      </div>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="inset-0 left-0 top-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none p-0 sm:rounded-none">
          <DialogHeader className="border-b px-6 py-4 sm:text-center">
            <DialogTitle className="text-center text-3xl text-primary">Palautat kamoja</DialogTitle>
            <p className="text-center text-muted-foreground">
              Valitse mitkä tavarat palautat. Jos sinulla ei ole kaikkia käsillä, voit palauttaa
              osan nyt ja loput myöhemmin.
            </p>
          </DialogHeader>

          <div className="overflow-y-auto">
            <div className="mx-auto grid min-h-full w-full max-w-[1600px] items-stretch gap-6 px-6 py-6 lg:grid-cols-[1.7fr_1fr]">
              {/* Left: item selection */}
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Palautettavat tavarat ({returnableReservations.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:flex-1 lg:auto-rows-fr xl:grid-cols-3">
                  {returnableReservations.map((reservation) => {
                    const checked = selectedIds.has(reservation.id);
                    return (
                      <div
                        key={reservation.id}
                        onClick={() => toggleSelected(reservation.id)}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border-2 bg-muted p-3',
                          checked ? 'border-success' : 'border-border',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 shrink-0"
                          checked={checked}
                          onChange={() => toggleSelected(reservation.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <ReservationItemImage
                          itemId={reservation.item.id}
                          itemName={reservation.item.name}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-base font-bold">{reservation.item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Määrä: {reservation.amount} kpl
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isPartialReturn && (
                  <div className="rounded-lg border-2 border-warning bg-warning/10 p-4">
                    <p className="font-bold text-warning">
                      Osittainen palautus: {selectedIds.size} / {returnableReservations.length}{' '}
                      tavaraa
                    </p>
                    <p className="mt-1 text-sm">
                      Valitsemattomat tavarat jäävät lainaan ja voit palauttaa ne myöhemmin.
                    </p>
                  </div>
                )}
              </div>

              {/* Right: tip, damage report, terms */}
              <div className="flex flex-col gap-4">
                <div className="rounded-lg border-2 border-primary/30 bg-primary/10 p-4">
                  <p className="font-bold text-primary">
                    💡 Vinkki: Ota kuva palautettavista kamoista
                  </p>
                  <p className="mt-1 text-sm">
                    Suosittelemme ottamaan kuvan palautettavista tavaroista puhelimellasi ennen kuin
                    laitat ne laatikkoon. Jos palautuksesta tulee myöhemmin hämminkiä, kuva
                    puhelimessasi toimii omana todisteenasi. Kuvaa ei tarvitse lähettää mihinkään —
                    säilytä se omassa puhelimessasi.
                  </p>
                </div>

                <div className="rounded-lg border-2 border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm leading-relaxed">
                    Vahvistamalla palautuksen otat vastuun siitä, että valitsemasi tavarat ovat
                    mukana, puhtaita ja toimivassa kunnossa sekä mahdolliset vahingot raportoituna.
                    Palauta tavarat oikeaan laatikkoon.
                  </p>
                  <label className="mt-3 flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    {allSelected
                      ? 'Ymmärrän ja hyväksyn vastuuni palautettavista tavaroista.'
                      : 'Ymmärrän että valitsemattomat tavarat jäävät yhä minun vastuulleni.'}
                  </label>
                </div>

                <div className="rounded-lg border-2 bg-muted p-4 lg:flex lg:flex-1 lg:flex-col">
                  <p className="text-sm leading-relaxed">
                    Mikäli jokin tavara puuttuu tai on vahingoittunut lainauksen aikana, kirjoita
                    siitä vapaamuotoinen raportti alle. Tavanomaisesta käytöstä johtuneiden
                    vahinkojen osalta et ole lähtökohtaisesti korvausvastuussa kunhan raportoit
                    niistä.
                  </p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-destructive">
                    <IoMdAlert className="mr-2 inline" />
                    Huomio: Tapahtuneiden vahinkojen ilmoittamatta jättäminen johtaa
                    automaattisesti kaluston lainauskieltoon sekä korvausvastuuseen
                    vahingoittuneen kaluston koko arvoon asti.
                  </p>
                  <Textarea
                    placeholder="Kirjoita raportti tähän..."
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    className="mt-2 min-h-[100px] resize-y text-base lg:flex-1"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:justify-center">
            <Button
              variant="success"
              size="lg"
              onClick={handleConfirmReturn}
              className="h-[60px] w-full max-w-md text-xl"
              isLoading={isLoading}
              disabled={!termsAccepted || selectedIds.size === 0}
            >
              {isPartialReturn
                ? `Vahvista osittainen palautus (${selectedIds.size})`
                : 'Vahvista palautus'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={boxOpen} onOpenChange={(o) => (!o ? handleBoxInstructionsClose() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pt-2 text-center text-2xl">Palautusohje</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <div className="rounded-lg border-4 border-primary/40 bg-primary/10 p-8 text-center">
              <p className="mb-3 font-medium">Palauta tavarat lokeroon:</p>
              <h3 className="text-5xl font-bold text-primary">{boxInfo?.name}</h3>
            </div>
            {boxInfo?.description && (
              <div className="rounded-md border bg-primary/10 p-5">
                <p className="mb-2 text-lg font-bold">Lisätiedot:</p>
                <p>{boxInfo.description}</p>
              </div>
            )}
            <div className="rounded-md bg-success/10 p-5 text-center">
              <p className="font-medium text-success">
                Kiitos palauttamisesta! Muista laittaa kaikki tavarat oikeaan lokeroon.
              </p>
            </div>
          </div>
          <DialogFooter className="justify-center pb-2">
            <Button
              onClick={handleBoxInstructionsClose}
              size="lg"
              className="h-[60px] w-[200px] text-xl"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default function ReturnView({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleReturn = async (
    loanId: string,
    reservationIds: string[],
    reportContent: string,
  ): Promise<{ name: string; description: string | null } | null> => {
    try {
      const response = await fetch('/api/loan/loanReturned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, reservationIds, reportContent }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Palautus onnistui!', { description: 'Laina on merkitty palautetuksi.' });
        return result.box;
      } else {
        throw new Error('Palautus epäonnistui');
      }
    } catch {
      toast.error('Virhe', { description: 'Palautus epäonnistui. Yritä uudelleen.' });
      return null;
    }
  };

  const handleReturnComplete = () => {
    router.push('/');
  };

  if (!session?.user) {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Palauta lainoja' }]} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="mb-4 text-3xl font-semibold">Palauta lainoja</h1>
          {loans.length === 0 ? (
            <div className="py-8 text-center">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Ei käytössä olevia lainoja
              </h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {loans.map((loan) => (
                <LoanReturnCard
                  key={loan.id}
                  loan={loan}
                  onReturn={handleReturn}
                  onReturnComplete={handleReturnComplete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
