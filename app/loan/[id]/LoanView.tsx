'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import NotAuthenticated from '@/components/NotAuthenticated';
import NextLink from 'next/link';
import ReservationTableLoanView from '@/components/ReservationTableLoanView';
import ReportCard from '@/components/ReportCard';
import StartLoanConfirmation from '@/components/StartLoanConfirmation';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateTime } from '@/components/DateTime';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const [expandedReportId, setExpandedReportId] = React.useState<string | null>(null);
  const [affectedItems, setAffectedItems] = React.useState<{ [key: string]: number }>({});
  const [announcement, setAnnouncement] = React.useState<{ itemId: string; content: string }>({
    itemId: '',
    content: '',
  });
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

  const setReportToProcessing = (
    reportId: string,
    affectedItems?: { [key: string]: number },
  ) =>
    guard(async () => {
      await fetch('/api/loan/editReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: 'IN_PROGRESS', affectedItems }),
      });
      toast.success('Raportti otettu käsittelyyn');
      router.refresh();
    });

  const resolveReport = (reportId: string, affectedItems?: { [key: string]: number }) =>
    guard(async () => {
      await fetch('/api/loan/editReport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, status: 'RESOLVED', affectedItems }),
      });
      toast.success('Raportti merkitty käsitellyksi');
      router.refresh();
    });

  const sendAnnouncement = (itemId: string, content: string) =>
    guard(async () => {
      await fetch('/api/item/createAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement: { itemId, message: content } }),
      });
      toast.success('Ilmoitus lähetetty');
    });

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

  const canEdit = isAdmin
    ? derivedStatus !== 'CANCELLED' &&
      derivedStatus !== 'INUSE' &&
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
        <h1 className="mb-4 text-3xl font-semibold">
          Laina: {loan.description || 'Ei kuvausta'}
        </h1>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Perustiedot</h2>
          <div className="flex flex-col gap-3">
            <p>
              Aloitusaika: <DateTime value={loan.startTime} format="long" />
            </p>
            <p>
              Lopetusaika: <DateTime value={loan.endTime} format="long" />
            </p>
            <p>Lainaaja: {loan.loaner || loan.user.name || loan.user.email}</p>
            {loan.loaner && loan.user.name && loan.loaner !== loan.user.name && (
              <p>Tili: {loan.user.name}</p>
            )}
            {loan.box && <p>Laatikko: {loan.box.name}</p>}
            <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Kamat</h2>
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
        </div>

        {canSeeReports && (
          <ReportCard
            reports={reports}
            loan={loan}
            expandedReportId={expandedReportId}
            setExpandedReportId={setExpandedReportId}
            announcement={announcement}
            setAnnouncement={setAnnouncement}
            affectedItems={affectedItems}
            setAffectedItems={setAffectedItems}
            onSetProcessing={setReportToProcessing}
            onSetResolved={resolveReport}
            onSendAnnouncement={sendAnnouncement}
          />
        )}

        {derivedStatus === 'RETURNED' ? (
          <div className="rounded-lg border border-success/50 bg-success/10 p-6">
            <h2 className="text-xl font-semibold text-success">
              Lainaustapahtuma suoritettu loppuun
            </h2>
          </div>
        ) : canMarkReturned ? (
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-3">
              <h3 className="mb-2 text-xl font-semibold">Merkitse laatikossa olevat palautetuksi</h3>
              <p className="text-sm text-muted-foreground">
                Valitse ne tavarat, jotka olet fyysisesti tarkistanut laatikosta.
              </p>
              <div className="flex flex-col gap-2">
                {inBoxReservations.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => toggleProcessing(r.id)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border p-3',
                      processingIds.has(r.id) ? 'border-success' : 'border-border',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={processingIds.has(r.id)}
                      onChange={() => toggleProcessing(r.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="flex-1">
                      {r.item.name}{' '}
                      <span className="text-muted-foreground">({r.amount} kpl)</span>
                    </p>
                  </div>
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
          </div>
        ) : (
          (canReject || canCancel || canEdit || canApprove || canStartUse) && (
            <div className="rounded-lg border bg-card p-6">
              <div className="flex flex-col gap-3">
                <h3 className="mb-2 text-xl font-semibold">Toiminnot</h3>
                {canStartUse && (
                  <div className="rounded-md border border-warning/50 bg-warning/10 p-4">
                    <p className="font-semibold text-warning">Oletko hakenut tavarat varastosta?</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Laina on hyväksytty, mutta sitä ei ole vielä merkitty käyttöön. Kun olet
                      noutanut tavarat, paina <strong>&quot;Aloita lainaus&quot;</strong> — vasta
                      silloin laina on virallisesti käynnissä ja voit myöhemmin palauttaa tavarat.
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3 md:flex-row">
                  {canReject && (
                    <Button variant="destructive" onClick={() => setRejectOpen(true)} className="flex-1" disabled={busy}>
                      Hylkää
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => setCancelOpen(true)}
                      className="flex-1"
                      disabled={busy}
                    >
                      Peru laina
                    </Button>
                  )}
                  {canEdit && (
                    <Button asChild variant="warning" className="flex-1">
                      <NextLink href={isAdmin ? `/admin/editLoan/${loan.id}` : `/loan/${loan.id}/edit`}>
                        Muokkaa
                      </NextLink>
                    </Button>
                  )}
                  {canApprove && (
                    <Button variant="success" onClick={approveLoan} className="flex-1" isLoading={busy}>
                      Hyväksy
                    </Button>
                  )}
                  {canStartUse && (
                    <Button onClick={() => setStartLoanOpen(true)} className="flex-1" disabled={busy}>
                      Aloita lainaus
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        <div className="rounded-lg border bg-card p-6">
          <h2 className="mb-4 text-2xl font-semibold">Historia</h2>
          {history.length === 0 ? (
            <p className="text-muted-foreground">Ei historiamerkintöjä.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((entry) => {
                const who = entry.actedBy?.name || entry.actedBy?.email || 'Järjestelmä';
                return (
                  <div key={entry.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold">{getLoanHistoryActionLabel(entry.action)}</p>
                      <DateTime
                        value={entry.createdAt}
                        format="numeric"
                        className="text-sm text-muted-foreground"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{who}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Hylätäänkö laina?</DialogTitle>
            </DialogHeader>
            <p>Lainahakemus hylätään. Oletko varma?</p>
            <DialogFooter>
              <Button variant="destructive" onClick={rejectLoan} isLoading={busy}>
                Hylkää
              </Button>
              <Button variant="secondary" onClick={() => setRejectOpen(false)} disabled={busy}>
                Peruuta
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Perutaanko laina?</DialogTitle>
            </DialogHeader>
            <p>
              Laina perutaan ja varatut tavarat vapautuvat muille. Et voi enää noutaa tavaroita
              tällä varauksella. Oletko varma?
            </p>
            <DialogFooter>
              <Button variant="destructive" onClick={cancelLoan} isLoading={busy}>
                Peru laina
              </Button>
              <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={busy}>
                Älä peru
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <StartLoanConfirmation
          isOpen={startLoanOpen}
          onClose={() => setStartLoanOpen(false)}
          loan={loan}
        />
      </div>
    </>
  );
}
