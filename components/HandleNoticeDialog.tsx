'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { FilterChip } from '@/components/ui/filter-chip';
import { NumberInput } from '@/components/ui/number-input';
import { SelectableRow } from '@/components/ui/selectable-row';
import { DateTime } from '@/components/DateTime';
import {
  getReportStatusLabel,
  getReportStatusColor,
  getReportCreatedLabel,
} from '@/utils/loanHelpers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ReservationLike {
  item: { id: string; name: string; amount: number };
  amount: number;
}

export interface NoticeReport {
  id: string;
  content: string;
  createdAt: string | Date;
  created: string;
  status: string;
  affectedItems?: { itemId: string; amount: number }[];
  announcements?: { id: string }[];
}

interface HandleNoticeDialogProps {
  report: NoticeReport;
  reservations: ReservationLike[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Triage one loaner-written huomio, in the order an admin actually works:
 * read it → say which kamat it concerns → decide whether loaners should see it
 * → close it out. Publishing reuses the same tick-boxes as the tagging step, so
 * "which kamat" is answered once instead of twice.
 */
export default function HandleNoticeDialog({
  report,
  reservations,
  open,
  onOpenChange,
}: HandleNoticeDialogProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  // Seed from what triage already recorded, so reopening a huomio shows the
  // tags that are on it rather than an empty list.
  const [affectedItems, setAffectedItems] = React.useState<Record<string, number>>(() =>
    Object.fromEntries((report.affectedItems ?? []).map((a) => [a.itemId, a.amount])),
  );
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [publishKind, setPublishKind] = React.useState<'KORJATTAVAA' | 'TIEDOKSI'>('KORJATTAVAA');
  const [publishMessage, setPublishMessage] = React.useState(report.content);

  const taggedIds = Object.entries(affectedItems)
    .filter(([, amount]) => amount > 0)
    .map(([itemId]) => itemId);
  const publishedCount = report.announcements?.length ?? 0;

  const guard = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const saveTags = (status: string) =>
    fetch('/api/loan/editReport', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: report.id, status, affectedItems }),
    });

  const setStatus = (status: 'IN_PROGRESS' | 'RESOLVED') =>
    guard(async () => {
      const res = await saveTags(status);
      if (!res.ok) {
        toast.error('Huomion käsittely epäonnistui');
        return;
      }
      toast.success(
        status === 'IN_PROGRESS'
          ? 'Huomio jäi selvitykseen'
          : 'Huomio merkitty hoidetuksi',
      );
      onOpenChange(false);
      router.refresh();
    });

  const publish = () =>
    guard(async () => {
      const res = await fetch('/api/item/createAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: taggedIds,
          message: publishMessage,
          kind: publishKind,
          reportId: report.id,
        }),
      });
      if (!res.ok) {
        toast.error('Huomion julkaisu epäonnistui');
        return;
      }
      // Publishing scopes itself to the ticked kamat, so persist that same
      // tagging now — otherwise closing with "Sulje" would throw away the
      // answer the admin just gave. Status is left exactly as it was.
      await saveTags(report.status);
      toast.success(
        taggedIds.length === 1
          ? 'Huomio julkaistu lainaajille'
          : `Huomio julkaistu ${taggedIds.length} kamalle`,
      );
      setPublishOpen(false);
      router.refresh();
    });

  const toggleItem = (itemId: string, fallbackAmount: number) =>
    setAffectedItems((prev) => ({
      ...prev,
      [itemId]: prev[itemId] > 0 ? 0 : fallbackAmount,
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Käsittele huomio</DialogTitle>
        </DialogHeader>

        <Card variant="muted" padding="md">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant={getReportStatusColor(report.status)}>
              {getReportStatusLabel(report.status)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {getReportCreatedLabel(report.created)}
              {' · '}
              <DateTime value={report.createdAt} format="long" />
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{report.content}</p>
        </Card>

        {publishedCount > 0 && (
          <Alert variant="info" icon={false}>
            Tästä huomiosta on jo julkaistu {publishedCount} huomio
            {publishedCount === 1 ? '' : 'ta'} lainaajille.
          </Alert>
        )}

        <Card variant="inset" padding="md">
          <p className="font-semibold">Mitä kamoja tämä koskee?</p>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Merkintä näkyy kaman sivulla ylläpidolle. Se ei estä lainaamista — jos kamaa ei
            pidä lainata sellaisenaan, julkaise siitä huomio lainaajille alla.
          </p>
          <div className="flex flex-col gap-2">
            {reservations.map((reservation) => {
              const tagged = affectedItems[reservation.item.id] > 0;
              return (
                <div key={reservation.item.id} className="flex items-center gap-2">
                  <SelectableRow
                    selected={tagged}
                    onSelectedChange={() => toggleItem(reservation.item.id, reservation.amount)}
                    className="flex-1"
                  >
                    <span className="text-sm">{reservation.item.name}</span>
                  </SelectableRow>
                  {tagged && (
                    <div className="flex shrink-0 items-center gap-1">
                      <NumberInput
                        value={affectedItems[reservation.item.id]}
                        min={1}
                        max={reservation.item.amount}
                        onChange={(value) =>
                          setAffectedItems((prev) => ({ ...prev, [reservation.item.id]: value }))
                        }
                        aria-label={`${reservation.item.name} — määrä`}
                      />
                      <span className="text-sm text-muted-foreground">kpl</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card
          as="details"
          padding="none"
          open={publishOpen}
          onToggle={(e) => setPublishOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm">
            <Megaphone className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">Julkaise huomio lainaajille</span>
            <span className="ml-auto text-muted-foreground">{publishOpen ? '▴' : '▾'}</span>
          </summary>
          <div className="border-t p-4">
            <p className="mb-3 text-sm text-muted-foreground">
              Julkaistu huomio näkyy kaikille kaman kohdalla, kun he selaavat kalustoa. Käytä
              tätä, kun asia koskee myös seuraavia lainaajia.
            </p>

            {taggedIds.length === 0 ? (
              <Alert variant="warning" icon={false}>
                Rastita ensin yllä ne kamat, joita huomio koskee.
              </Alert>
            ) : (
              <>
                <div className="mb-3">
                  <Label>Millainen huomio?</Label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <FilterChip
                      active={publishKind === 'KORJATTAVAA'}
                      onClick={() => setPublishKind('KORJATTAVAA')}
                    >
                      Korjattavaa
                    </FilterChip>
                    <FilterChip
                      active={publishKind === 'TIEDOKSI'}
                      onClick={() => setPublishKind('TIEDOKSI')}
                    >
                      Tiedoksi
                    </FilterChip>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {publishKind === 'KORJATTAVAA'
                      ? 'Kamassa on vikaa tai puutteita. Näkyy lainaajille punaisena varoituksena.'
                      : 'Neutraali tiedote kamasta. Näkyy lainaajille ilman varoitusväriä.'}
                  </p>
                </div>

                <Label htmlFor="publish-message">Teksti lainaajille</Label>
                <Textarea
                  id="publish-message"
                  className="mt-1.5"
                  rows={3}
                  value={publishMessage}
                  onChange={(e) => setPublishMessage(e.target.value)}
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Esitäytetty lainaajan tekstillä — muokkaa se muille sopivaksi.
                </p>

                <Button
                  size="sm"
                  className="mt-3"
                  disabled={!publishMessage.trim() || busy}
                  onClick={publish}
                >
                  Julkaise {taggedIds.length === 1 ? 'kamalle' : `${taggedIds.length} kamalle`}
                </Button>
              </>
            )}
          </div>
        </Card>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Sulje
          </Button>
          <Button variant="warning" onClick={() => setStatus('IN_PROGRESS')} disabled={busy}>
            Jää selvitykseen
          </Button>
          <Button variant="success" onClick={() => setStatus('RESOLVED')} disabled={busy}>
            Merkitse hoidetuksi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
