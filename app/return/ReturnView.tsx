'use client';

import React, { useLayoutEffect, useState } from 'react';
import { CircleAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import {
  deriveLoanStatus,
  getLoanStatusLabel,
  getLoanStatusColor,
  getLoanerName,
} from '@/utils/loanHelpers';
import ItemThumb from '@/components/ItemThumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/utils/dateFormat';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { SelectableRow } from '@/components/ui/selectable-row';
import BoxContents from '@/components/BoxContents';
import { boxContents, type ContentRow } from '@/utils/boxContents';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
    /** Set when the kama is a säilytyspaikka — what should be back in the box. */
    asLocation: { items: ContentRow[] } | null;
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

/**
 * How small the kama grid may be squeezed before scrolling is the friendlier
 * answer. At 0.55 a card is still legible across the room from the kiosk.
 */
const MIN_FIT = 0.55;

/**
 * Keeps the palautus dialog on one screen: a loan of a dozen kamaa pushed the
 * "Vahvista palautus" button below the fold, so the palauttaja had to scroll a
 * full-screen dialog to finish. The kama grid is shrunk by exactly the overflow
 * instead — `zoom`, not `transform: scale`, because a scaled grid keeps its
 * full-size layout box and the hole underneath it stays. A zoomed block still
 * fills its column on its own — its width resolves in the zoomed coordinate
 * space — so only the height needs any help.
 *
 * Desktop only: on a phone the cards are already one per row and scrolling
 * through them is how a phone works.
 */
function useFitToScreen(
  area: HTMLDivElement | null,
  /** Anything whose change resizes the dialog; `null` while it is closed. */
  layout: string | null,
) {
  // The scroll area arrives through a callback ref rather than `useRef`: Radix
  // mounts the dialog's contents in a commit of its own, *after* this
  // component's layout effect has already run, so a plain ref is still null
  // when it matters.
  useLayoutEffect(() => {
    const grid = area?.querySelector<HTMLElement>('[data-fit-grid]');
    if (layout === null || !area || !grid) return;

    const fit = () => {
      // Measure unshrunken, or every pass would compound the last one.
      grid.style.zoom = '1';
      if (!window.matchMedia('(min-width: 1024px)').matches) return;
      const overflow = area.scrollHeight - area.clientHeight;
      if (overflow <= 0) return;
      const natural = grid.getBoundingClientRect().height;
      grid.style.zoom = String(Math.max(MIN_FIT, (natural - overflow) / natural));
    };

    fit();
    // The dialog is the size of the window, so this fires on a resize, an
    // orientation flip and the on-screen keyboard — not on our own zoom.
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [area, layout]);
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
  const [scrollArea, setScrollArea] = useState<HTMLDivElement | null>(null);
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

  // Which contents of which box were *not* found, keyed per reservation so two
  // boxes holding a kama of the same name can't tick each other's.
  const [missingContents, setMissingContents] = useState<Set<string>>(new Set());
  const missingKey = (reservationId: string, contentId: string) =>
    `${reservationId}:${contentId}`;

  const toggleMissing = (reservationId: string, contentId: string) => {
    setMissingContents((prev) => {
      const next = new Set(prev);
      const key = missingKey(reservationId, contentId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Anything left unticked inside a box that is being returned becomes a line
  // of the huomio — the contents are not reservations, so this note is the only
  // place a missing vasara can be recorded. Boxes that aren't being returned
  // are left out: their contents are still out with them.
  const missingNote = returnableReservations
    .filter((reservation) => selectedIds.has(reservation.id))
    .map((reservation) => {
      const gone = boxContents(reservation.item.asLocation?.items, loan.id).filter(
        (content) =>
          !content.outOnLoan && missingContents.has(missingKey(reservation.id, content.id)),
      );
      if (gone.length === 0) return null;
      return `Puuttuu laatikosta "${reservation.item.name}": ${gone
        .map((content) => content.name)
        .join(', ')}`;
    })
    .filter(Boolean)
    .join('\n');

  const allSelected = selectedIds.size === returnableReservations.length;
  const isPartialReturn =
    selectedIds.size > 0 && selectedIds.size < returnableReservations.length;

  const handleConfirmReturn = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const box = await onReturn(
        loan.id,
        Array.from(selectedIds),
        [missingNote, reportContent.trim()].filter(Boolean).join('\n\n'),
      );
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

  useFitToScreen(
    scrollArea,
    // Re-fit whenever the dialog grows or shrinks under its own steam: the two
    // alerts below the grid come and go as kamaa are ticked off.
    returnOpen
      ? `${returnableReservations.length}|${isPartialReturn}|${missingNote}`
      : null,
  );

  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

  return (
    <>
      <Card padding="md" className="flex h-full flex-col gap-3 overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 flex-1 text-lg font-semibold">
            {loan.description || getLoanerName(loan)}
          </h3>
          <Badge variant={getLoanStatusColor(derivedStatus)} className="shrink-0">
            {getLoanStatusLabel(derivedStatus)}
          </Badge>
        </div>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium">Lainaaja:</span> {getLoanerName(loan)}
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
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="inset-0 left-0 top-0 h-dvh max-h-dvh w-screen max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-none p-0 sm:rounded-none">
          <DialogHeader className="border-b px-6 py-4 sm:text-center">
            <DialogTitle className="text-center text-3xl text-primary">Palautat kamoja</DialogTitle>
            <p className="text-center text-muted-foreground">
              Valitse mitkä tavarat palautat. Jos sinulla ei ole kaikkia käsillä, voit palauttaa
              osan nyt ja loput myöhemmin.
            </p>
          </DialogHeader>

          <div ref={setScrollArea} className="overflow-y-auto">
            <div className="mx-auto grid min-h-full w-full max-w-[1600px] items-stretch gap-6 px-6 py-6 lg:grid-cols-[1.7fr_1fr]">
              {/* Left: item selection */}
              <div className="flex flex-col gap-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Palautettavat tavarat ({returnableReservations.length})
                </p>
                {/* `auto-rows-min` + `content-start`, not `auto-rows-fr`: the
                    column still claims the height (so the partial-return note
                    sits under the list rather than mid-panel), but the rows
                    keep their own size and pack at the top. Equal-height rows
                    read fine with a dozen kamaa and absurd with one, which
                    stretched into a full-height empty box. */}
                <div
                  data-fit-grid
                  className="grid gap-3 sm:grid-cols-2 lg:flex-1 lg:auto-rows-min lg:content-start xl:grid-cols-3"
                >
                  {returnableReservations.map((reservation) => {
                    const checked = selectedIds.has(reservation.id);
                    return (
                      <SelectableRow
                        key={reservation.id}
                        selected={checked}
                        onSelectedChange={() => toggleSelected(reservation.id)}
                        size="lg"
                        className="bg-muted"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3">
                            <ItemThumb
                              itemId={reservation.item.id}
                              alt={reservation.item.name}
                              className="h-20 w-20 rounded-md"
                            />
                            <div className="flex min-w-0 flex-1 flex-col">
                              <p className="truncate text-base font-bold">
                                {reservation.item.name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Määrä: {reservation.amount} kpl
                              </p>
                            </div>
                          </div>
                          {/* Checking a box back in is checking its contents. */}
                          <BoxContents
                            defaultOpen
                            contents={boxContents(reservation.item.asLocation?.items, loan.id)}
                            checklist={{
                              // The component speaks content ids; the keys are
                              // per reservation, so narrow to this box's own.
                              missing: new Set(
                                (reservation.item.asLocation?.items ?? [])
                                  .filter((content) =>
                                    missingContents.has(missingKey(reservation.id, content.id)),
                                  )
                                  .map((content) => content.id),
                              ),
                              onToggle: (contentId) => toggleMissing(reservation.id, contentId),
                            }}
                          />
                        </div>
                      </SelectableRow>
                    );
                  })}
                </div>

                {isPartialReturn && (
                  <Alert
                    variant="warning"
                    title={`Osittainen palautus: ${selectedIds.size} / ${returnableReservations.length} tavaraa`}
                  >
                    Valitsemattomat tavarat jäävät lainaan ja voit palauttaa ne myöhemmin.
                  </Alert>
                )}
              </div>

              {/* Right: tip, then the huomio field, then the terms gate. The
                  field sits *above* the checkbox on purpose — it used to be
                  below the thing that unlocks the confirm button, so on a phone
                  you had already committed before you saw it. */}
              <div className="flex flex-col gap-4">
                <Alert variant="info" title="💡 Vinkki: Ota kuva palautettavista kamoista">
                  Suosittelemme ottamaan kuvan palautettavista tavaroista puhelimellasi ennen kuin
                  laitat ne laatikkoon. Jos palautuksesta tulee myöhemmin hämminkiä, kuva
                  puhelimessasi toimii omana todisteenasi. Kuvaa ei tarvitse lähettää mihinkään —
                  säilytä se omassa puhelimessasi.
                </Alert>

                <Card variant="muted" padding="md" className="lg:flex lg:flex-1 lg:flex-col">
                  <Label htmlFor="return-notice" className="text-base">
                    Huomasitko kamoissa jotain?
                  </Label>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Jos jokin tavara puuttuu tai vahingoittui lainauksen aikana, kirjaa se tähän.
                    Tavanomaisesta käytöstä johtuneista vahingoista et ole lähtökohtaisesti
                    korvausvastuussa, kunhan kirjaat ne. Ylläpito käy huomiot läpi.
                  </p>
                  <p className="mt-2 text-sm font-bold leading-relaxed text-destructive">
                    <CircleAlert className="mr-2 inline h-4 w-4" />
                    Vahinkojen ilmoittamatta jättäminen johtaa automaattisesti kaluston
                    lainauskieltoon sekä korvausvastuuseen vahingoittuneen kaluston koko arvoon
                    asti.
                  </p>
                  {/* Shown rather than written into the field: the field is
                      the palauttaja's own words, and typing over them as they
                      tick boxes would be maddening. It is prepended to the
                      huomio on submit. */}
                  {missingNote && (
                    <Alert variant="warning" className="mt-2" title="Lisätään huomioon">
                      <p className="whitespace-pre-line">{missingNote}</p>
                    </Alert>
                  )}
                  <Textarea
                    id="return-notice"
                    placeholder="Esim. kattilan kahva irtosi"
                    value={reportContent}
                    onChange={(e) => setReportContent(e.target.value)}
                    className="mt-2 min-h-[100px] resize-y text-base lg:flex-1"
                  />
                </Card>

                <Alert variant="info" icon={false}>
                  <p className="leading-relaxed">
                    Vahvistamalla palautuksen otat vastuun siitä, että valitsemasi tavarat ovat
                    mukana, puhtaita ja toimivassa kunnossa sekä mahdolliset vahingot kirjattuna.
                    Palauta tavarat oikeaan laatikkoon.
                  </p>
                  <label className="mt-3 flex cursor-pointer items-center gap-2">
                    <Checkbox
                      required
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    {allSelected
                      ? 'Ymmärrän ja hyväksyn vastuuni palautettavista tavaroista.'
                      : 'Ymmärrän että valitsemattomat tavarat jäävät yhä minun vastuulleni.'}
                  </label>
                </Alert>
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
            <Alert variant="info" icon={false} className="flex-col p-8 text-center">
              <p className="mb-3 font-medium">Palauta tavarat lokeroon:</p>
              <p className="text-5xl font-bold text-primary">{boxInfo?.name}</p>
            </Alert>
            {boxInfo?.description && (
              <Alert variant="info" icon={false} title="Lisätiedot:">
                {boxInfo.description}
              </Alert>
            )}
            <Alert variant="success" icon={false} className="justify-center text-center">
              <p className="font-medium text-success">
                Kiitos palauttamisesta! Muista laittaa kaikki tavarat oikeaan lokeroon.
              </p>
            </Alert>
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

  // Admins and the kiosk see everyone's loans here; a regular user only ever
  // sees their own (the page query scopes them). Say which, so nobody wonders
  // why the list is 40 long — or why theirs is the only one.
  const seesAllLoans =
    session?.user?.group === 'ADMIN' || session?.user?.group === 'KIOSK';

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
        toast.success('Palautus onnistui!', {
          description: reportContent.trim()
            ? 'Laina merkittiin palautetuksi ja huomiosi kirjattiin.'
            : 'Laina on merkitty palautetuksi.',
        });
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
          <PageHeader
            title="Palauta lainoja"
            description={
              seesAllLoans
                ? 'Kaikki noudetut ja noutamattomat lainat. Etsi oma lainasi listalta ja paina Palauta.'
                : 'Omat lainasi, joita ei ole vielä palautettu.'
            }
          />
          {loans.length === 0 ? (
            <EmptyState
              title="Ei käytössä olevia lainoja"
              action={
                <Button size="lg" onClick={() => router.push('/')}>
                  Takaisin alkuun
                </Button>
              }
            />
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </>
  );
}
