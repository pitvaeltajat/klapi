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
  ) => Promise<{ name: string; description: string | null } | null>;
  onReturnComplete: () => void;
}) => {
  const [returnOpen, setReturnOpen] = useState(false);
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxInfo, setBoxInfo] = useState<{ name: string; description: string | null } | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reportContent, setReportContent] = useState('');

  const inuseReservations = React.useMemo(
    () => loan.reservations.filter((r) => r.status === ReservationStatus.INUSE),
    [loan.reservations],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(inuseReservations.map((r) => r.id)),
  );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = selectedIds.size === inuseReservations.length;
  const isPartialReturn = selectedIds.size > 0 && selectedIds.size < inuseReservations.length;

  const handleConfirmReturn = async () => {
    const box = await onReturn(loan.id, Array.from(selectedIds));
    if (box) {
      setBoxInfo(box);
      setReturnOpen(false);
      setBoxOpen(true);
    }
    if (reportContent.trim() !== '') {
      try {
        await fetch('/api/loan/createReport', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            loanId: loan.id,
            content: reportContent,
            created: 'AFTER_LOAN',
          }),
        });
      } catch (error) {
        console.error('Virhe raportin lähettämisessä:', error);
      }
    }
  };

  const handleBoxInstructionsClose = () => {
    setBoxOpen(false);
    onReturnComplete();
  };

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

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
            Laina-aika: {new Date(loan.startTime).toLocaleDateString('fi-FI')} -{' '}
            {new Date(loan.endTime).toLocaleDateString('fi-FI')}
          </p>
          <div>
            <p className="mb-2 font-bold">Tavarat (käytössä):</p>
            <div className="flex flex-wrap gap-2">
              {inuseReservations.map((reservation) => (
                <Badge key={reservation.id} className="rounded-full">
                  {reservation.item.name} ({reservation.amount})
                </Badge>
              ))}
            </div>
          </div>
          <Button variant="success" size="lg" onClick={() => setReturnOpen(true)}>
            Palauta
          </Button>
        </div>
      </div>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-h-screen max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-3xl text-primary">Palautat kamoja</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6">
            <p className="text-center text-muted-foreground">
              Valitse mitkä tavarat palautat. Jos sinulla ei ole kaikkia käsillä, voit palauttaa
              osan nyt ja loput myöhemmin.
            </p>

            <div className="rounded-lg border-2 border-primary/30 bg-primary/10 p-4">
              <p className="font-bold text-primary">
                💡 Vinkki: Ota kuva palautettavista kamoista
              </p>
              <p className="mt-1 text-sm">
                Suosittelemme ottamaan kuvan palautettavista tavaroista puhelimellasi ennen kuin
                laitat ne laatikkoon. Jos palautuksesta tulee myöhemmin hämminkiä, kuva puhelimessasi
                toimii omana todisteenasi. Kuvaa ei tarvitse lähettää mihinkään — säilytä se
                omassa puhelimessasi.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {inuseReservations.map((reservation) => {
                const checked = selectedIds.has(reservation.id);
                return (
                  <div
                    key={reservation.id}
                    onClick={() => toggleSelected(reservation.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-4 rounded-lg border-2 bg-muted p-4',
                      checked ? 'border-success' : 'border-border',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={checked}
                      onChange={() => toggleSelected(reservation.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <ReservationItemImage
                      itemId={reservation.item.id}
                      itemName={reservation.item.name}
                    />
                    <div className="flex flex-1 flex-col">
                      <p className="text-lg font-bold">{reservation.item.name}</p>
                      <p className="text-muted-foreground">Määrä: {reservation.amount} kpl</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isPartialReturn && (
              <div className="rounded-lg border-2 border-warning bg-warning/10 p-4">
                <p className="font-bold text-warning">
                  Osittainen palautus: {selectedIds.size} / {inuseReservations.length} tavaraa
                </p>
                <p className="mt-1 text-sm">
                  Valitsemattomat tavarat jäävät lainaan ja voit palauttaa ne myöhemmin.
                </p>
              </div>
            )}

            <div className="rounded-lg border-2 bg-muted p-6">
              <p className="leading-relaxed">
                Mikäli jokin tavara puuttuu tai on vahingoittunut lainauksen aikana, kirjoita
                siitä vapaamuotoinen raportti alle. Tavanomaisesta käytöstä johtuneiden vahinkojen
                osalta et ole lähtökohtaisesti korvausvastuussa kunhan raportoit niistä.
              </p>
              <p className="mt-2 font-bold leading-relaxed text-destructive">
                <IoMdAlert className="mr-2 inline" />
                Huomio: Tapahtuneiden vahinkojen ilmoittamatta jättäminen johtaa automaattisesti
                kaluston lainauskieltoon sekä korvausvastuuseen vahingoittuneen kaluston koko
                arvoon asti.
              </p>
              <Textarea
                placeholder="Kirjoita raportti tähän..."
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-2 min-h-[120px] resize-y text-base"
              />
            </div>

            <div className="rounded-lg border-2 border-primary/30 bg-primary/10 p-6">
              <p className="leading-relaxed">
                Vahvistamalla palautuksen otat vastuun siitä, että valitsemasi tavarat ovat
                mukana, puhtaita ja toimivassa kunnossa sekä mahdolliset vahingot raportoituna.
                Palauta tavarat oikeaan laatikkoon.
              </p>
              <label className="mt-4 flex items-center gap-2">
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

            <Button
              variant="success"
              size="lg"
              onClick={handleConfirmReturn}
              className="h-[60px] text-xl"
              disabled={!termsAccepted || selectedIds.size === 0}
            >
              {isPartialReturn
                ? `Vahvista osittainen palautus (${selectedIds.size})`
                : 'Vahvista palautus'}
            </Button>
          </div>
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
  ): Promise<{ name: string; description: string | null } | null> => {
    try {
      const response = await fetch('/api/loan/loanReturned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loanId, reservationIds }),
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

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
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
            loans.map((loan) => (
              <LoanReturnCard
                key={loan.id}
                loan={loan}
                onReturn={handleReturn}
                onReturnComplete={handleReturnComplete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
