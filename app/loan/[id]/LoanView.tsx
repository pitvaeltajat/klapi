'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import NotAuthenticated from '@/components/NotAuthenticated';
import NextLink from 'next/link';
import ReservationTableLoanView from '@/components/ReservationTableLoanView';
import ReportCard from '@/components/ReportCard';
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
import { SelectableRow } from '@/components/ui/selectable-row';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DateTime } from '@/components/DateTime';

interface Report {
  id: string;
  content: string;
  createdAt: Date | string;
  status: string;
}

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
  reports: Report[];
  history: HistoryEntry[];
}) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [startLoanOpen, setStartLoanOpen] = React.useState(false);
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

  // The owner withdraws their own not-yet-picked-up loan: "Peru laina".
  const canCancel = isOwner && derivedStatus === 'ACCEPTED';

  // An admin rejects someone else's loan request: "Hylkää". The owner uses
  // cancel instead, so reject is reserved for admins acting on others' loans.
  const canReject =
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
  const canEdit = isAdmin
    ? derivedStatus !== 'CANCELLED' &&
      derivedStatus !== 'PARTIALLY_RETURNED' &&
      derivedStatus !== 'RETURNED'
    : isOwner && !loanStarted && derivedStatus === 'ACCEPTED';

  const canApprove =
    isAdmin &&
    derivedStatus !== 'ACCEPTED' &&
    derivedStatus !== 'CANCELLED' &&
    derivedStatus !== 'INUSE' &&
    derivedStatus !== 'PARTIALLY_RETURNED' &&
    derivedStatus !== 'RETURNED';

  const canStartUse = derivedStatus === 'ACCEPTED';

  const inBoxReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.IN_BOX,
  );
  const canMarkReturned = isAdmin && inBoxReservations.length > 0;
  const canSeeReports = isAdmin && reports.length > 0;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Lainat', href: '/loan' },
          { label: loan.description || 'Ei kuvausta' },
        ]}
      />
      <div className="flex flex-col gap-6">
        <PageHeader className="mb-0" title={`Laina: ${loan.description || 'Ei kuvausta'}`} />

        <Card>
          <CardTitle>Perustiedot</CardTitle>
          {/* A label/value grid rather than sentences: on a phone "Aloitusaika:
              perjantaina 24. heinäkuuta 2026 klo 12.17" wrapped onto two lines
              per row and the panel ate half the viewport. The label column is
              fixed, so the values line up and each row stays one or two short
              lines; the long weekday form only returns at sm. */}
          <dl className="flex flex-col gap-2 text-sm sm:text-base">
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Aloitusaika:</dt>
              <dd>
                <DateTime value={loan.startTime} format="numeric" className="sm:hidden" />
                <DateTime value={loan.startTime} format="long" className="hidden sm:inline" />
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Lopetusaika:</dt>
              <dd>
                <DateTime value={loan.endTime} format="numeric" className="sm:hidden" />
                <DateTime value={loan.endTime} format="long" className="hidden sm:inline" />
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted-foreground">Lainaaja:</dt>
              <dd className="break-all">{loan.loaner || loan.user.name || loan.user.email}</dd>
            </div>
            {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Tili:</dt>
                <dd>{loan.user.name}</dd>
              </div>
            )}
            {loan.box && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Laatikko:</dt>
                <dd>{loan.box.name}</dd>
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-2">
              <Badge variant={getLoanStatusColor(derivedStatus)}>
                {getLoanStatusLabel(derivedStatus)}
              </Badge>
              {reports.filter((r) => r.status !== 'RESOLVED').length > 0 && (
                <Badge variant="destructive">
                  Käsittelemättömiä raportteja:{' '}
                  {reports.filter((r) => r.status !== 'RESOLVED').length}
                </Badge>
              )}
            </div>
          </dl>
        </Card>

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
          <ReservationTableLoanView
            loan={{
              id: loan.id,
              reservations: loan.reservations.map((r) => ({
                id: r.id,
                itemId: r.itemId,
                amount: r.amount,
                status: r.status,
                item: { name: r.item.name },
              })),
            }}
          />
        </Card>

        {canSeeReports && (
          <ReportCard reports={reports} reservations={loan.reservations} />
        )}

        {derivedStatus === 'RETURNED' ? (
          <Alert variant="success" title="Lainaustapahtuma suoritettu loppuun" />
        ) : canMarkReturned ? (
          <Card>
            <div className="flex flex-col gap-3">
              <h3 className="mb-2 text-xl font-semibold">Merkitse laatikossa olevat palautetuksi</h3>
              <p className="text-sm text-muted-foreground">
                Valitse ne tavarat, jotka olet fyysisesti tarkistanut laatikosta.
              </p>
              <div className="flex flex-col gap-2">
                {inBoxReservations.map((r) => (
                  <SelectableRow
                    key={r.id}
                    selected={processingIds.has(r.id)}
                    onSelectedChange={() => toggleProcessing(r.id)}
                  >
                    {r.item.name} <span className="text-muted-foreground">({r.amount} kpl)</span>
                  </SelectableRow>
                ))}
              </div>
              <Button
                onClick={loanProcessed}
                variant="success"
                size="lg"
                className="w-full"
                isLoading={busy}
                disabled={processingIds.size === 0}
              >
                {processingIds.size === inBoxReservations.length
                  ? 'Merkitse kaikki laatikossa olevat palautetuksi'
                  : `Merkitse valitut palautetuksi (${processingIds.size})`}
              </Button>
            </div>
          </Card>
        ) : (
          (canReject || canCancel || canEdit || canApprove || canStartUse) && (
            <Card>
              <div className="flex flex-col gap-3">
                <h3 className="mb-2 text-xl font-semibold">Toiminnot</h3>
                {canStartUse && (
                  <Alert variant="warning" title="Oletko hakenut tavarat varastosta?">
                    Laina on hyväksytty, mutta sitä ei ole vielä merkitty käyttöön. Kun olet
                    noutanut tavarat, paina <strong>&quot;Aloita lainaus&quot;</strong> — vasta
                    silloin laina on virallisesti käynnissä ja voit myöhemmin palauttaa tavarat.
                  </Alert>
                )}
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
              </div>
            </Card>
          )
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

        <StartLoanConfirmation
          isOpen={startLoanOpen}
          onClose={() => setStartLoanOpen(false)}
          loan={loan}
        />
      </div>
    </>
  );
}
