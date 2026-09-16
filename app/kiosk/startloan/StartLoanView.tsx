'use client';

import React, { useMemo, useState } from 'react';
import { CircleAlert, History } from 'lucide-react';
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
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '@/utils/datepickerLocale';
import { formatDateOnly } from '@/utils/dateFormat';
import { isSameCalendarDay, setDefaultTime, setEndOfDay } from '@/utils/dateRange';
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
  const acceptedReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.ACCEPTED,
  );

  const originalRows = useMemo(() => rowsFromReservations(loan.reservations), [loan]);
  const [endDate, setEndDate] = useState(() => new Date(loan.endTime));
  const { availabilities, loading: loadingAvailability } = useAvailabilities({
    start: new Date(loan.startTime),
    end: endDate,
  });
  const editor = useLoanItemRows(originalRows, availabilities);
  const endChanged = endDate.getTime() !== new Date(loan.endTime).getTime();
  const dirty = editor.dirty || endChanged;

  // A loan picked up early still can't be returned before it starts, nor
  // before today. Same rule as the kiosk loan flow: 18:00 on the return day,
  // end of day for a loan that starts and ends on the same day.
  const today = new Date();
  const loanStart = new Date(loan.startTime);
  const minReturn = loanStart > today ? loanStart : today;
  const handleReturnDateChange = (date: Date | null) => {
    if (!date) return;
    setEndDate(isSameCalendarDay(date, loanStart) ? setEndOfDay(date) : setDefaultTime(date));
  };

  /**
   * The kamat and the return day are edited in place on the card, and what was changed is saved
   * on the way to the start confirmation — one button, not a separate save
   * step to forget before handing the kamat over.
   */
  const saveItemsAndConfirm = async () => {
    if (!dirty) {
      setOpen(true);
      return;
    }
    setSavingItems(true);
    try {
      const response = await fetch('/api/loan/updateLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: loan.id,
          description: loan.description,
          startTime: loan.startTime,
          endTime: endDate,
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
      // The server's answer carries what the rows can't: an oma kama's real
      // row and a säilytyspaikka's contents.
      router.refresh();
      setOpen(true);
    } catch {
      toast.error('Virhe', { description: 'Yhteysvirhe, yritä uudelleen' });
    } finally {
      setSavingItems(false);
    }
  };

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
            {formatDateOnly(endDate)}
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">Palautuspäivä</p>
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={() => setEndDate(new Date(loan.endTime))}
                disabled={!endChanged}
              >
                <History className="h-4 w-4" />
                Palauta alkuperäinen
              </Button>
            </div>
            <div className="flex justify-center overflow-x-auto">
              <DatePicker
                selected={endDate}
                onChange={handleReturnDateChange}
                inline
                monthsShown={2}
                minDate={minReturn}
                dateFormat="dd.MM.yyyy"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold">Kamat</p>
              <Button
                size="sm"
                variant="ghost"
                className="gap-2"
                onClick={editor.reset}
                disabled={!editor.dirty}
              >
                <History className="h-4 w-4" />
                Palauta alkuperäiset
              </Button>
            </div>
            {loadingAvailability ? (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {loan.reservations.map((r) => (
                  <Skeleton key={r.id} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <LoanItemRows editor={editor} className="lg:grid-cols-2" />
            )}
            {/* This is the counter: the kamat are being handed over right now,
                so what is inside a säilytyspaikka is checked here rather than
                on the box's own page. */}
            {acceptedReservations.map((reservation) => (
              <BoxContents
                key={`contents-${reservation.id}`}
                defaultOpen
                contents={boxContents(reservation.item.asLocation?.items, loan.id)}
              />
            ))}
            <div className="flex flex-col gap-2">
              <Label>Lisää kama</Label>
              <AddLoanItemPicker editor={editor} items={items} askCustomDetails={false} />
            </div>
          </div>
          <Button
            variant="success"
            size="lg"
            onClick={saveItemsAndConfirm}
            isLoading={savingItems}
            disabled={
              loadingAvailability || editor.rows.length === 0 || editor.overBooked.length > 0
            }
          >
            Aloita lainaus
          </Button>
          {dirty && (
            <p className="text-center text-sm text-muted-foreground">
              Muutokset tallennetaan, kun aloitat lainauksen.
            </p>
          )}
        </div>
      </Card>

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
