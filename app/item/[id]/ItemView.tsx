'use client';

import { Item, Category, Reservation, LoanStatus, ItemHistoryAction } from '@prisma/client';
import { useItemOriginalImageState } from '@/hooks/useItemImage';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import ReservationTable from '@/components/ReservationTable';
import Breadcrumbs from '@/components/Breadcrumbs';
import { DateTime } from '@/components/DateTime';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  getItemHistoryActionLabel,
  formatItemHistoryChanges,
  isBulkItemHistory,
} from '@/utils/itemHelpers';
import { Skeleton } from '@/components/ui/skeleton';
import ItemAnnouncements, { type ItemAnnouncement } from './ItemAnnouncements';

interface ItemHistoryEntry {
  id: string;
  action: ItemHistoryAction;
  details: unknown;
  createdAt: string | Date;
  actedBy: { id: string; name: string | null; email: string | null } | null;
}

interface ReportAffectedItemWithReport {
  id: string;
  amount: number;
  report: {
    id: string;
    content: string;
    status: string;
    created: string;
    createdAt: string | Date;
    loan: {
      id: string;
      description: string | null;
      user: { name: string | null };
    };
  };
}

interface ItemWithRelations extends Item {
  categories: Category[];
  location: { id: string; name: string } | null;
  announcements: ItemAnnouncement[];
  reservations: (Reservation & {
    loan: {
      id: string;
      description: string | null;
      status: LoanStatus;
      startTime: Date | string;
      endTime: Date | string;
      userId: string;
    };
    item: { name: string };
  })[];
  reportAffectedItems: ReportAffectedItemWithReport[];
}

const REPORT_STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  OPEN: { label: 'Käsittelemättä', variant: 'destructive' },
  IN_PROGRESS: { label: 'Käsittelyssä', variant: 'warning' },
  RESOLVED: { label: 'Ratkaistu', variant: 'success' },
};

export default function ItemView({
  item,
  history,
}: {
  item: ItemWithRelations;
  history: ItemHistoryEntry[];
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.group === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const { src: imageSrc, status: imageStatus, placeholder } = useItemOriginalImageState(item.id);

  const reportAffectedItems = [...item.reportAffectedItems].sort(
    (a, b) =>
      new Date(b.report.createdAt).getTime() - new Date(a.report.createdAt).getTime(),
  );

  const deleteItem = async () => {
    try {
      const response = await fetch('/api/item/deleteItem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.id),
      });

      if (response.ok) {
        toast.success('Legit', { description: 'Kama poistettu' });
        setOpen(false);
        router.push('/');
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err) {
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  return (
    <>
      <Breadcrumbs items={[{ label: item.name }]} />
      <div className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold md:text-4xl">{item.name}</h1>

        {item.description && (
          <p className="text-base text-foreground/90 md:text-lg">{item.description}</p>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Määrä:</p>
            <p className="text-lg font-bold">{item.amount} kpl</p>
          </div>
          {item.location && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Sijainti:</p>
              <p className="text-lg font-bold">{item.location.name}</p>
            </div>
          )}
          {item.categories && item.categories.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-muted-foreground">Kategoriat:</p>
              <div className="flex flex-wrap gap-2">
                {item.categories.map((category) => (
                  <Badge key={category.id}>{category.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <hr />

        <div>
          {imageStatus === 'loading' ? (
            <Skeleton className="h-[300px] w-full max-w-xl rounded-md md:h-[500px]" />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element -- dynamic S3 URL with onError fallback */
            <img
              src={imgError ? placeholder : imageSrc}
              alt={item.name}
              onError={() => setImgError(true)}
              className="max-h-[300px] max-w-full rounded-md object-contain md:max-h-[500px]"
            />
          )}
        </div>

        {isAdmin && (
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/admin/edititem/${item.id}`)}>Muokkaa</Button>
            <Button variant="destructive" onClick={() => setOpen(true)}>
              Poista
            </Button>
          </div>
        )}

        <ItemAnnouncements
          itemId={item.id}
          announcements={item.announcements}
          isAdmin={isAdmin}
        />

        {isAdmin && reportAffectedItems.length > 0 && (
          <section className="rounded-lg border bg-card p-4 md:p-6">
            <h2 className="mb-4 text-xl font-semibold">
              Raportit ({reportAffectedItems.length})
            </h2>
            <ul className="flex flex-col gap-3">
              {reportAffectedItems.map(({ id, amount, report }) => {
                const status = REPORT_STATUS[report.status] ?? {
                  label: report.status,
                  variant: 'secondary' as const,
                };
                return (
                  <li key={id} className="rounded-md border bg-muted p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {report.created === 'BEFORE_LOAN' ? 'Ennen lainaa' : 'Lainan jälkeen'}
                        {' · '}
                        <DateTime value={report.createdAt} format="numeric" />
                        {' · koski '}
                        {amount} kpl
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{report.content}</p>
                    <Link
                      href={`/loan/${report.loan.id}`}
                      className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Avaa laina
                      {report.loan.user.name ? ` — ${report.loan.user.name}` : ''}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-4">
          <h2 className="mb-4 text-xl font-semibold">Lainahistoria</h2>
          {item.reservations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ei lainahistoriaa.</p>
          ) : (
            <ReservationTable reservations={item.reservations} isAdmin={isAdmin} />
          )}
        </div>

        {isAdmin && (
          <section className="rounded-lg border bg-card p-4 md:p-6">
            <h2 className="mb-4 text-xl font-semibold">Muokkaushistoria</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ei muokkaushistoriaa.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {history.map((entry) => {
                  const who = entry.actedBy?.name || entry.actedBy?.email || 'Järjestelmä';
                  const changes = formatItemHistoryChanges(entry.details);
                  const bulk = isBulkItemHistory(entry.details);
                  return (
                    <li key={entry.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-semibold">
                          {getItemHistoryActionLabel(entry.action)}
                        </p>
                        <DateTime
                          value={entry.createdAt}
                          format="numeric"
                          className="text-sm text-muted-foreground"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {who}
                        {bulk && ' · joukkotoiminto'}
                      </p>
                      {changes.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-0.5 text-sm text-foreground/90">
                          {changes.map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="mx-4">
          <DialogHeader>
            <DialogTitle>Poistetaanko kama?</DialogTitle>
          </DialogHeader>
          <p>
            <strong>{item.name}</strong> poistetaan. Oletko varma?
          </p>
          <DialogFooter>
            <Button onClick={deleteItem}>Poista</Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Peruuta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
