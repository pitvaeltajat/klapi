'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import NotAuthenticated from '@/components/NotAuthenticated';
import NextLink from 'next/link';
import { CalendarRange, Inbox, MoveRight, UserRound } from 'lucide-react';
import LoanItemList from '@/components/LoanItemList';
import LoanNotices from '@/components/LoanNotices';
import { type NoticeReport } from '@/components/HandleNoticeDialog';
import StartLoanConfirmation from '@/components/StartLoanConfirmation';
import SaveAsTemplateButton from '@/components/SaveAsTemplateButton';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import {
  Loan,
  User,
  Reservation,
  Item,
  Box as BoxType,
  ReservationStatus,
} from '@prisma/client';
import {
  getLoanStatusLabel,
  getLoanStatusColor,
  deriveLoanStatus,
  getLoanHistoryActionLabel,
} from '@/utils/loanHelpers';
import { LoanHistoryAction } from '@prisma/client';
import { templateDraftItemsFromLoan } from '@/utils/templateDraft';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateTime } from '@/components/DateTime';

interface LoanWithRelations extends Loan {
  user: User;
  box: BoxType | null;
  reservations: (Reservation & {
    item: Item;
    status: ReservationStatus;
  })[];
}

interface HistoryEntry {
  id: string;
  action: LoanHistoryAction;
  createdAt: Date | string;
  details: unknown;
  actedBy: { id: string; name: string | null; email: string | null } | null;
}

export default function LoanView({
  loan,
  reports,
  history,
}: {
  loan: LoanWithRelations;
  reports: NoticeReport[];
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [startLoanOpen, setStartLoanOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const { data: session } = useSession();

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = session?.user?.group === 'ADMIN';
  const loanStarted = new Date(loan.startTime) <= new Date();

  const approveLoan = () =>
    guard(async () => {
      await fetch('/api/loan/approveLoan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loan.id }),
      });
      toast.success('Laina hyväksytty');
      router.push('/loan');
    });

  const cancelLoan = () =>
    guard(async () => {
      try {
        const res = await fetch('/api/loan/cancelLoan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loan.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Lainan peruminen epäonnistui');
        }
        toast.success('Laina peruttu', { description: 'Laina peruttiin onnistuneesti' });
        router.push('/loan');
      } catch (err) {
        toast.error('Virhe', {
          description: err instanceof Error ? err.message : 'Tuntematon virhe',
        });
      }
    });

  // Soft delete: the loan drops out of every listing but keeps its history, and
  // an admin can bring it back from this same page.
  const deleteLoan = () =>
    guard(async () => {
      try {
        const res = await fetch('/api/loan/deleteLoan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loan.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Lainan poisto epäonnistui');
        }
        toast.success('Laina poistettu', {
          description: 'Löydät sen Lainat-sivun "Poistetut"-suodattimesta, jos haluat palauttaa sen.',
        });
        setDeleteOpen(false);
        router.push('/loan');
      } catch (err) {
        toast.error('Virhe', {
          description: err instanceof Error ? err.message : 'Tuntematon virhe',
        });
      }
    });

  const restoreLoan = () =>
    guard(async () => {
      try {
        const res = await fetch('/api/loan/restoreLoan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loan.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Lainan palautus epäonnistui');
        }
        toast.success('Laina palautettu');
        router.refresh();
      } catch (err) {
        toast.error('Virhe', {
          description: err instanceof Error ? err.message : 'Tuntematon virhe',
        });
      }
    });

  const rejectLoan = () =>
    guard(async () => {
      try {
        const res = await fetch('/api/loan/rejectLoan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: loan.id }),
        });
        await res.json();
        toast.success('Laina hylätty', { description: 'Laina hylätty onnistuneesti' });
        router.push('/loan');
      } catch (err) {
        toast.error('Error', { description: err instanceof Error ? err.message : 'Tuntematon virhe' });
      }
    });

  const [processingIds, setProcessingIds] = React.useState<Set<string>>(
    () =>
      new Set(
        loan.reservations.filter((r) => r.status === ReservationStatus.IN_BOX).map((r) => r.id),
      ),
  );

  const loanProcessed = () =>
    guard(async () => {
      const reservationIds = Array.from(processingIds);
      await fetch('/api/loan/loanProcessed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loan.id, reservationIds }),
      });
      toast.success('Kamat palautettu');
      router.push('/loan');
    });

  const toggleProcessing = (id: string) => {
    setProcessingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // The rows "tallenna pohjaksi" opens with — the admin edits them in the
  // dialog before anything is saved. Kept above the authorization
  // early-return, as hooks must be.
  const templateDraftItems = React.useMemo(
    () => templateDraftItemsFromLoan(loan.reservations),
    [loan.reservations],
  );

  const isKiosk = session?.user?.group === 'KIOSK';

  const derivedStatus = deriveLoanStatus(
    loan.reservations.map((r) => ({ status: r.status })),
    loan.status,
  );

  if (!(session?.user?.group === 'ADMIN' || session?.user?.id === loan.user.id || isKiosk)) {
    return <NotAuthenticated />;
  }

  const isOwner = session?.user?.id === loan.user.id;

  // A soft-deleted loan is frozen: only an admin can see it at all, and the one
  // thing left to do with it is put it back.
  const isDeleted = Boolean(loan.deletedAt);

  // The owner withdraws their own not-yet-picked-up loan: "Peru laina".
  const canCancel = !isDeleted && isOwner && derivedStatus === 'ACCEPTED';

  // An admin rejects someone else's loan request: "Hylkää". The owner uses
  // cancel instead, so reject is reserved for admins acting on others' loans.
  const canReject =
    !isDeleted &&
    isAdmin &&
    !isOwner &&
    derivedStatus !== 'REJECTED' &&
    derivedStatus !== 'CANCELLED' &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'PARTIALLY_RETURNED' &&
    derivedStatus !== 'RETURNED';

  // Admins may edit ongoing (INUSE) loans — e.g. to extend the return date.
  // updateLoan validates availability against other reservations, so an extend
  // that would clash with someone else's booking is rejected server-side.
  // PARTIALLY_RETURNED is excluded: its reservations have mixed statuses that
  // updateLoan's recreate-all logic would flatten and corrupt.
  const canEdit =
    !isDeleted &&
    (isAdmin
      ? derivedStatus !== 'CANCELLED' &&
        derivedStatus !== 'PARTIALLY_RETURNED' &&
        derivedStatus !== 'RETURNED'
      : isOwner && !loanStarted && derivedStatus === 'ACCEPTED');

  const canApprove =
    !isDeleted &&
    isAdmin &&
    derivedStatus !== 'ACCEPTED' &&
    derivedStatus !== 'CANCELLED' &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'PARTIALLY_RETURNED' &&
    derivedStatus !== 'RETURNED';

  const canStartUse = !isDeleted && derivedStatus === 'ACCEPTED';

  const inBoxReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.IN_BOX,
  );
  const canMarkReturned = !isDeleted && isAdmin && inBoxReservations.length > 0;

  // Deleting is the admin's "this loan should never have existed" — a duplicate,
  // a test, one entered on the wrong account. Unlike hylkääminen and peruminen
  // it is not a decision about the loan, so it is offered in every state.
  const canDelete = isAdmin && !isDeleted;

  // The status buttons: hidden once the loan is finished, and while the Kamat
  // card is still offering the check-back-in step.
  const showStatusActions =
    derivedStatus !== 'RETURNED' &&
    !canMarkReturned &&
    (canReject || canCancel || canEdit || canApprove || canStartUse);

  // The loaner is asked to write huomiot under a liability warning, so they get
  // to read their own back. Admins see them on every loan; a kiosk session is a
  // shared terminal, so it doesn't.
  const canSeeNotices = (isAdmin || isOwner) && reports.length > 0;
  const unresolvedReports = reports.filter((r) => r.status !== 'RESOLVED').length;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Lainat', href: '/loan' },
          { label: loan.description || 'Ei kuvausta' },
        ]}
      />
      <div className="flex flex-col gap-6">
        {/* The status is what you check the page for, so it sits in the page's
            top-right corner rather than buried at the bottom of Perustiedot. */}
        <PageHeader
          className="mb-0"
          title={`Laina: ${loan.description || 'Ei kuvausta'}`}
          actions={
            <>
              <Badge variant={getLoanStatusColor(derivedStatus)}>
                {getLoanStatusLabel(derivedStatus)}
              </Badge>
              {unresolvedReports > 0 && (
                <Badge variant="destructive">
                  Käsittelemättömiä huomioita: {unresolvedReports}
                </Badge>
              )}
            </>
          }
        />

        {isDeleted && (
          <Alert variant="destructive" title="Tämä laina on poistettu">
            <p>
              Laina ei näy listoilla eikä varaa kamoja, mutta sen tiedot ja historia ovat
              tallessa. Poistettu{' '}
              <DateTime value={loan.deletedAt!} format="numeric" className="font-medium" />.
            </p>
            <Button
              variant="secondary"
              className="mt-3 w-full md:w-auto"
              onClick={restoreLoan}
              isLoading={busy}
            >
              Palauta laina
            </Button>
          </Alert>
        )}

        <Card>
          <CardTitle>Perustiedot</CardTitle>
          {/* Icon-led rows rather than "Aloitusaika: perjantaina 24. heinäkuuta
              2026 klo 12.17" — the label words were longer than the values they
              introduced and wrapped every row onto two lines on a phone. The
              icon carries the meaning; the sr-only text carries it for readers
              that can't see it. */}
          <dl className="flex flex-col gap-3 text-sm sm:text-base">
            <div className="flex items-center gap-3">
              <dt className="shrink-0 text-muted-foreground">
                <CalendarRange aria-hidden className="h-5 w-5" />
                <span className="sr-only">Laina-aika</span>
              </dt>
              <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <DateTime value={loan.startTime} format="klo" />
                <MoveRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <DateTime value={loan.endTime} format="klo" />
              </dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="shrink-0 text-muted-foreground">
                <UserRound aria-hidden className="h-5 w-5" />
                <span className="sr-only">Lainaaja</span>
              </dt>
              <dd className="flex flex-wrap items-baseline gap-x-2 break-all">
                {loan.loaner || loan.user.name || loan.user.email}
                {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
                  <span className="text-sm text-muted-foreground">
                    <span className="sr-only">Tili: </span>
                    {loan.user.name}
                  </span>
                )}
              </dd>
            </div>
            {loan.box && (
              <div className="flex items-center gap-3">
                <dt className="shrink-0 text-muted-foreground">
                  <Inbox aria-hidden className="h-5 w-5" />
                  <span className="sr-only">Laatikko</span>
                </dt>
                <dd>{loan.box.name}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* One list, not two: the items and the "tick what's back in the box"
            step used to be separate panels that repeated the same rows. */}
        <Card>
          <CardHeader>
            <CardTitle>Kamat</CardTitle>
            {isAdmin && templateDraftItems.length > 0 && (
              <SaveAsTemplateButton
                defaultName={loan.description || ''}
                items={templateDraftItems}
              />
            )}
          </CardHeader>
          {canMarkReturned && (
            <p className="mb-3 text-sm text-muted-foreground">
              Valitse ne tavarat, jotka olet fyysisesti tarkistanut laatikosta.
            </p>
          )}
          <LoanItemList
            reservations={loan.reservations.map((r) => ({
              id: r.id,
              itemId: r.itemId,
              amount: r.amount,
              status: r.status,
              item: { name: r.item.name },
            }))}
            selection={
              canMarkReturned
                ? {
                    isSelectable: (r) => r.status === ReservationStatus.IN_BOX,
                    selected: processingIds,
                    onToggle: toggleProcessing,
                  }
                : undefined
            }
          />
          {canMarkReturned && (
            <Button
              onClick={loanProcessed}
              variant="success"
              size="lg"
              className="mt-4 w-full"
              isLoading={busy}
              disabled={processingIds.size === 0}
            >
              {processingIds.size === inBoxReservations.length
                ? 'Merkitse kaikki laatikossa olevat palautetuksi'
                : `Merkitse valitut palautetuksi (${processingIds.size})`}
            </Button>
          )}
        </Card>

        {canSeeNotices && (
          <LoanNotices
            reports={reports}
            reservations={loan.reservations}
            isAdmin={isAdmin}
          />
        )}

        {derivedStatus === 'RETURNED' && !isDeleted && (
          <Alert variant="success" title="Lainaustapahtuma suoritettu loppuun" />
        )}

        {/* While there is still something to check back in, the return step in
            the Kamat card is the only action offered — same as before it moved
            up there. Poistaminen is the exception: it stands on its own and is
            offered whatever else the loan allows. */}
        {(showStatusActions || canDelete) && (
          <Card>
            <div className="flex flex-col gap-3">
              <h3 className="mb-2 text-xl font-semibold">Toiminnot</h3>
              {showStatusActions && canStartUse && (
                <Alert variant="warning" title="Oletko hakenut tavarat varastosta?">
                  Laina on hyväksytty, mutta sitä ei ole vielä merkitty käyttöön. Kun olet
                  noutanut tavarat, paina <strong>&quot;Aloita lainaus&quot;</strong> — vasta
                  silloin laina on virallisesti käynnissä ja voit myöhemmin palauttaa tavarat.
                </Alert>
              )}
              {showStatusActions && (
                <div className="flex flex-col gap-3 md:flex-row">
                  {canReject && (
                    <Button variant="destructive" onClick={() => setRejectOpen(true)} className="flex-1 md:max-w-[25%]" disabled={busy}>
                      Hylkää
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => setCancelOpen(true)}
                      className="flex-1 md:max-w-[25%]"
                      disabled={busy}
                    >
                      Peru laina
                    </Button>
                  )}
                  {canEdit && (
                    <Button asChild variant="warning" className="flex-1 md:max-w-[25%]">
                      <NextLink href={isAdmin ? `/admin/editLoan/${loan.id}` : `/loan/${loan.id}/edit`}>
                        Muokkaa
                      </NextLink>
                    </Button>
                  )}
                  {canApprove && (
                    <Button variant="success" onClick={approveLoan} className="flex-1 md:max-w-[25%]" isLoading={busy}>
                      Hyväksy
                    </Button>
                  )}
                  {canStartUse && (
                    <Button onClick={() => setStartLoanOpen(true)} className="flex-1 md:max-w-[25%]" disabled={busy}>
                      Aloita lainaus
                    </Button>
                  )}
                </div>
              )}
              {canDelete && (
                <div className="flex flex-col gap-2 border-t border-border pt-3">
                  <p className="text-sm text-muted-foreground">
                    Poistettu laina katoaa listoilta eikä varaa kamoja, mutta sen tiedot
                    säilyvät: löydät sen Lainat-sivun &quot;Poistetut&quot;-suodattimesta ja
                    voit palauttaa sen.
                  </p>
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteOpen(true)}
                    className="w-full md:w-auto md:self-start"
                    disabled={busy}
                  >
                    Poista laina
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Collapsed by default: the audit trail matters when something is being
            investigated, but it's the longest block on the page and pushes the
            actions off screen for the borrower who just wants to start a loan. */}
        <Card as="details" className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
            <CardTitle className="mb-0">Historia</CardTitle>
            <span className="text-sm text-muted-foreground">
              {history.length} merkintää · <span className="group-open:hidden">näytä</span>
              <span className="hidden group-open:inline">piilota</span>
            </span>
          </summary>
          <div className="mt-4">
          {history.length === 0 ? (
            <EmptyState variant="inline" title="Ei historiamerkintöjä." />
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((entry) => {
                const who = entry.actedBy?.name || entry.actedBy?.email || 'Järjestelmä';
                const viaKiosk =
                  typeof entry.details === 'object' &&
                  entry.details !== null &&
                  'viaKiosk' in entry.details &&
                  (entry.details as { viaKiosk?: boolean }).viaKiosk === true;
                const auto =
                  typeof entry.details === 'object' &&
                  entry.details !== null &&
                  'auto' in entry.details &&
                  (entry.details as { auto?: boolean }).auto === true;
                return (
                  <Card key={entry.id} variant="inset" padding="sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{getLoanHistoryActionLabel(entry.action)}</p>
                      <DateTime
                        value={entry.createdAt}
                        format="numeric"
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {who}
                      {viaKiosk && ' · kaluston koneella'}
                      {auto && ' · automaattisesti'}
                    </p>
                  </Card>
                );
              })}
            </div>
          )}
          </div>
        </Card>

        <ConfirmDialog
          open={rejectOpen}
          onOpenChange={setRejectOpen}
          title="Hylätäänkö laina?"
          description="Lainahakemus hylätään. Oletko varma?"
          confirmLabel="Hylkää"
          onConfirm={rejectLoan}
          isLoading={busy}
        />

        <ConfirmDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          title="Perutaanko laina?"
          description="Laina perutaan ja varatut tavarat vapautuvat muille. Et voi enää noutaa tavaroita tällä varauksella. Oletko varma?"
          confirmLabel="Peru laina"
          cancelLabel="Älä peru"
          onConfirm={cancelLoan}
          isLoading={busy}
        />

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Poistetaanko laina?"
          description="Laina piilotetaan listoilta ja sen varaamat kamat vapautuvat. Tiedot ja historia säilyvät, ja voit palauttaa lainan tältä sivulta. Oletko varma?"
          confirmLabel="Poista laina"
          cancelLabel="Älä poista"
          onConfirm={deleteLoan}
          isLoading={busy}
        />

        <StartLoanConfirmation
          isOpen={startLoanOpen}
          onClose={() => setStartLoanOpen(false)}
          loan={loan}
        />
      </div>
    </>
  );
}
