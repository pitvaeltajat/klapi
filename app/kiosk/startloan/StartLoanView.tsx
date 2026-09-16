'use client';

import React, { useMemo, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { Item, LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor, getLoanerName } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { formatDateOnly } from '@/utils/dateFormat';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AddLoanItemPicker,
  LoanItemRows,
  rowsFromReservations,
  rowsToReservations,
  useLoanItemRows,
} from '@/components/LoanItemsEditor';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import BoxContents from '@/components/BoxContents';
import { boxContents, type ContentRow } from '@/utils/boxContents';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
    /** Set when the kama is a säilytyspaikka — what goes out with it. */
    asLocation?: { items: ContentRow[] } | null;
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

const EditItemsDialog = ({
  onOpenChange,
  loan,
  items,
}: {
  onOpenChange: (open: boolean) => void;
  loan: LoanType;
  items: Item[];
}) => {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const originalRows = useMemo(() => rowsFromReservations(loan.reservations), [loan]);
  const { availabilities, loading } = useAvailabilities({
    start: new Date(loan.startTime),
    end: new Date(loan.endTime),
  });
  const editor = useLoanItemRows(originalRows, availabilities);

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
          reservations: rowsToReservations(editor.rows),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Virhe', {
          description: Array.isArray(data.details)
            ? data.details.join('\n')
            : data.message || 'Virhe tallennettaessa',
        });
        return;
      }
      toast.success('Laina päivitetty');
      // The server's answer carries what the rows can't: the reservation
      // statuses, an oma kama's real row, a säilytyspaikka's contents.
      router.refresh();
      onOpenChange(false);
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe, yritä uudelleen' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Muokkaa lainan kamoja</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <LoanItemRows editor={editor} className="sm:grid-cols-2" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Lisää kama</Label>
              <AddLoanItemPicker editor={editor} items={items} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Peruuta
          </Button>
          <Button
            variant="success"
            onClick={handleSave}
            isLoading={saving}
            disabled={loading || !editor.dirty || editor.overBooked.length > 0}
          >
            Tallenna muutokset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LoanStartCard = ({
  loan,
  items,
  onStart,
  onStartComplete,
}: {
  loan: LoanType;
  items: Item[];
  onStart: (id: string, reportContent: string) => Promise<void>;
  onStartComplete: () => void;
}) => {
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
      <Card padding="md" className="mb-4 overflow-hidden">
        <div className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold">{loan.description || getLoanerName(loan)}</h3>
          <Badge variant={getLoanStatusColor(derivedStatus)} className="w-fit">
            {getLoanStatusLabel(derivedStatus)}
          </Badge>
          <p>Lainaaja: {getLoanerName(loan)}</p>
          <p>
            Laina-aika: {formatDateOnly(loan.startTime)} -{' '}
            {formatDateOnly(loan.endTime)}
          </p>
          <div>
            <p className="mb-2 font-bold">Tavarat:</p>
            <div className="flex flex-wrap gap-2">
              {acceptedReservations.map((reservation) => (
                <Badge key={reservation.id}>
                  {reservation.item.name} ({reservation.amount})
                </Badge>
              ))}
            </div>
            {/* This is the counter: the kamat are being handed over right now,
                so what is inside a säilytyspaikka is checked here rather than
                on the box's own page. */}
            {acceptedReservations.map((reservation) => (
              <BoxContents
                key={`contents-${reservation.id}`}
                defaultOpen
                contents={boxContents(reservation.item.asLocation?.items, loan.id)}
                className="mt-2"
              />
            ))}
          </div>
          <Alert variant="info" title="Tarvitseeko kamoihin muutoksia?">
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => setEditOpen(true)}
            >
              Muokkaa kamoja
            </Button>
          </Alert>
          <Button variant="success" size="lg" onClick={() => setOpen(true)}>
            Aloita lainaus
          </Button>
        </div>
      </Card>

      {editOpen && (
        <EditItemsDialog
          onOpenChange={setEditOpen}
          loan={loan}
          items={items}
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
            <Alert variant="info" title="💡 Vinkki: Ota kuva kamoista puhelimellasi" className="mb-4">
              Suosittelemme ottamaan kuvan kamoista ennen lainauksen aloitusta. Jos palautuksessa
              tulee hämminkiä, kuva puhelimessasi toimii omana todisteenasi.
            </Alert>
            <Card variant="muted" padding="sm" className="mb-4">
              <Label htmlFor="pickup-notice" className="text-base">
                Huomasitko kamoissa jotain?
              </Label>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Tarkista ennen lainan vahvistamista, että kaikki kamat ovat kunnossa, ja kirjaa
                puutteet tähän (esim. puuttuvat kiilat, reikä laavussa).
              </p>
              <p className="mt-2 text-sm leading-relaxed text-destructive">
                <CircleAlert className="mr-2 inline h-4 w-4" />
                Voit joutua korvausvastuuseen, mikäli et kirjaa etukäteen kamoissa havaitsemiasi
                puutteita tai vahinkoja.
              </p>
              <Textarea
                id="pickup-notice"
                placeholder="Esim. laavun kulmassa pieni reikä"
                value={reportContent}
                onChange={(e) => setReportContent(e.target.value)}
                className="mt-2 min-h-[100px] text-sm"
              />
            </Card>
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              Ymmärrän ja hyväksyn vastuuni lainattavista tavaroista.
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Peruuta
            </Button>
            <Button variant="success" onClick={handleStartLoan} disabled={!termsAccepted} isLoading={isLoading}>
              Aloita lainaus
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
        toast.success('Lainaus aloitettu!', {
          description: reportContent.trim()
            ? 'Huomiosi kirjattiin.'
            : undefined,
        });
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
          <PageHeader title="Aloita lainaus" />
          {loans.length === 0 ? (
            <EmptyState
              title="Ei aloitettavia lainoja"
              action={
                <Button size="lg" onClick={() => router.push('/')}>
                  Takaisin alkuun
                </Button>
              }
            />
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
