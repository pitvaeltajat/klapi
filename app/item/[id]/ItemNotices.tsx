'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FilterChip } from '@/components/ui/filter-chip';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { DateTime } from '@/components/DateTime';
import {
  getReportStatusLabel,
  getReportStatusColor,
  getReportCreatedLabel,
  getAnnouncementKindLabel,
  getAnnouncementKindColor,
} from '@/utils/loanHelpers';

export interface ItemAnnouncement {
  id: string;
  message: string;
  kind: string;
  createdAt: string | Date;
  expiresAt: string | Date | null;
}

export interface ItemReport {
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

interface ItemNoticesProps {
  itemId: string;
  announcements: ItemAnnouncement[];
  reports: ItemReport[];
  isAdmin: boolean;
}

/**
 * Everything noticed about this kama, in one panel. The item page used to carry
 * two separate sections — "Ilmoitukset" and "Raportit" — describing the same
 * thing in different words; they are one list now, split only by who can see
 * what.
 */
export default function ItemNotices({
  itemId,
  announcements,
  reports,
  isAdmin,
}: ItemNoticesProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'KORJATTAVAA' | 'TIEDOKSI'>('TIEDOKSI');
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const isExpired = (a: ItemAnnouncement) =>
    a.expiresAt != null && new Date(a.expiresAt) <= new Date();
  const published = announcements.filter((a) => !isExpired(a));

  const openReports = reports.filter(
    ({ report }) => report.status === 'OPEN' || report.status === 'IN_PROGRESS',
  );

  const publish = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/item/createAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId], message: trimmed, kind }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Huomio julkaistu lainaajille');
      setMessage('');
      router.refresh();
    } catch {
      toast.error('Huomion julkaisu epäonnistui');
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch('/api/item/expireAnnouncement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('failed');
      toast.success('Huomio poistettu näkyvistä');
      router.refresh();
    } catch {
      toast.error('Huomion poisto epäonnistui');
    } finally {
      setRemovingId('');
    }
  };

  // A loaner with nothing to read doesn't need an empty panel.
  if (!isAdmin && published.length === 0) return null;

  return (
    <Card as="section" id="huomiot">
      <CardHeader className="justify-start gap-2">
        <MessageSquareWarning className="h-5 w-5 text-muted-foreground" />
        <CardTitle>Huomiot{published.length > 0 ? ` (${published.length})` : ''}</CardTitle>
      </CardHeader>

      {published.length === 0 ? (
        <EmptyState variant="inline" title="Tästä kamasta ei ole julkaistuja huomioita." />
      ) : (
        <ul className="flex flex-col gap-3">
          {published.map((a) => (
            <Card as="li" key={a.id} variant="inset" padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant={getAnnouncementKindColor(a.kind)} className="mb-1.5">
                    {getAnnouncementKindLabel(a.kind)}
                  </Badge>
                  <p className="whitespace-pre-wrap text-sm">{a.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Julkaistu <DateTime value={a.createdAt} format="numeric" />
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={removingId === a.id}
                    onClick={() => remove(a.id)}
                  >
                    Poista
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}

      {isAdmin && openReports.length > 0 && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-1 text-sm font-semibold">
            Lainaajien huomiot ({openReports.length})
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            Käsittelemättä olevia huomioita, jotka on merkitty koskemaan tätä kamaa. Näkyvät
            vain ylläpidolle.
          </p>
          <ul className="flex flex-col gap-3">
            {openReports.map(({ id, amount, report }) => (
              <Card as="li" key={id} variant="muted" padding="sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant={getReportStatusColor(report.status)}>
                    {getReportStatusLabel(report.status)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getReportCreatedLabel(report.created)}
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
              </Card>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="mt-4 border-t pt-4">
          <p className="mb-3 text-sm font-semibold">Julkaise huomio tästä kamasta</p>

          <Label>Millainen huomio?</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <FilterChip
              active={kind === 'KORJATTAVAA'}
              onClick={() => setKind('KORJATTAVAA')}
            >
              Korjattavaa
            </FilterChip>
            <FilterChip active={kind === 'TIEDOKSI'} onClick={() => setKind('TIEDOKSI')}>
              Tiedoksi
            </FilterChip>
          </div>
          <p className="mt-1.5 mb-3 text-xs text-muted-foreground">
            {kind === 'KORJATTAVAA'
              ? 'Kamassa on vikaa tai puutteita. Näkyy lainaajille punaisena varoituksena.'
              : 'Neutraali tiedote, esimerkiksi sijainnin muutos tai käyttöohje.'}
          </p>

          <Label htmlFor="notice-message">Teksti lainaajille</Label>
          <Textarea
            id="notice-message"
            className="mt-1.5"
            rows={3}
            placeholder="Näkyy kaikille tämän kaman kohdalla kalustoa selatessa"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button
            size="sm"
            className="mt-2"
            disabled={!message.trim() || submitting}
            onClick={publish}
          >
            Julkaise huomio
          </Button>
        </div>
      )}
    </Card>
  );
}
