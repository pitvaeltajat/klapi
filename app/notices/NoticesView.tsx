'use client';

import React from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Item, Announcement, Loan, Reservation, ReportAffectedItem } from '@prisma/client';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CountBadge } from '@/components/ui/count-badge';
import { DateTime } from '@/components/DateTime';
import HandleNoticeDialog from '@/components/HandleNoticeDialog';
import {
  getReportStatusLabel,
  getReportStatusColor,
  getReportCreatedLabel,
  getAnnouncementKindLabel,
  getAnnouncementKindColor,
} from '@/utils/loanHelpers';

type PublishedNotice = Announcement & { item: Item };

type PendingNotice = {
  id: string;
  content: string;
  createdAt: Date | string;
  created: string;
  status: string;
  loanId: string;
  loan: Loan & {
    reservations: (Reservation & { item: Item })[];
    user: { name: string | null };
  };
  affectedItems: (ReportAffectedItem & { item: Item })[];
  announcements: { id: string }[];
};

interface NoticesViewProps {
  announcements: PublishedNotice[];
  reports: PendingNotice[];
  isAdmin: boolean;
}

export default function NoticesView({ announcements, reports, isAdmin }: NoticesViewProps) {
  const router = useRouter();
  const [showRemoved, setShowRemoved] = React.useState(false);
  const [removingId, setRemovingId] = React.useState('');
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeReport = reports.find((r) => r.id === activeId) ?? null;

  const isRemoved = (a: PublishedNotice) =>
    a.expiresAt != null && new Date(a.expiresAt) <= new Date();

  const live = announcements.filter((a) => !isRemoved(a));
  const visible = showRemoved ? announcements : live;

  const removeNotice = async (id: string) => {
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

  return (
    <>
      <Breadcrumbs items={[{ label: 'Huomiot' }]} />
      <PageHeader title="Huomiot" />

      <Alert variant="info" title="Mikä on huomio?" className="mb-6">
        Huomio kertoo jotain kaman kunnosta tai käytöstä — esimerkiksi puutteesta,
        rikkoutumisesta tai siitä, missä kama nykyään on. Kirjoita oma huomiosi silloin, kun
        noudat tai palautat kamat: löydät kentän noudon ja palautuksen vahvistuksesta.
        {isAdmin
          ? ' Lainaajien kirjoittamat huomiot odottavat käsittelyä alla — julkaise niistä ne, jotka koskevat myös seuraavia lainaajia.'
          : ' Ylläpito käy huomiot läpi ja julkaisee tälle sivulle ne, jotka on hyvä tietää ennen lainaamista.'}
      </Alert>

      {isAdmin && (
        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-lg font-semibold sm:text-xl">Odottaa käsittelyä</h2>
            {reports.length > 0 && <CountBadge count={reports.length} />}
          </div>

          {reports.length === 0 ? (
            <EmptyState variant="card" title="Ei käsittelemättömiä huomioita" />
          ) : (
            <div className="flex flex-col gap-3">
              {reports.map((report) => (
                <Card key={report.id} padding="md" className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={getReportStatusColor(report.status)}>
                      {getReportStatusLabel(report.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getReportCreatedLabel(report.created)}
                      {' · '}
                      <DateTime value={report.createdAt} format="numeric" />
                    </span>
                    {report.announcements.length > 0 && (
                      <Badge variant="secondary">Julkaistu</Badge>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap break-words text-sm">{report.content}</p>

                  {report.affectedItems.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Koskee:{' '}
                      {report.affectedItems
                        .map((a) => `${a.item.name} (${a.amount} kpl)`)
                        .join(', ')}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <NextLink
                      href={`/loan/${report.loanId}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {report.loan.loaner || report.loan.user.name}
                      {report.loan.description ? ` — ${report.loan.description}` : ''}
                    </NextLink>
                    <Button size="sm" onClick={() => setActiveId(report.id)}>
                      Käsittele
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold sm:text-xl">
              {isAdmin ? 'Näkyy lainaajille' : 'Kalustoa koskevat huomiot'}
            </h2>
            {live.length > 0 && <CountBadge count={live.length} />}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={showRemoved} onChange={() => setShowRemoved(!showRemoved)} />
            Näytä poistetut
          </label>
        </div>

        {visible.length === 0 ? (
          <EmptyState
            variant="card"
            title={showRemoved ? 'Ei huomioita' : 'Ei julkaistuja huomioita'}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visible.map((notice) => {
              const removed = isRemoved(notice);
              return (
                <Card
                  key={notice.id}
                  padding="md"
                  className={removed ? 'opacity-60' : undefined}
                >
                  <div className="flex flex-col items-start gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={getAnnouncementKindColor(notice.kind)}>
                        {getAnnouncementKindLabel(notice.kind)}
                      </Badge>
                      <NextLink
                        href={`/item/${notice.item.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        {notice.item.name}
                      </NextLink>
                    </div>

                    <p className="whitespace-pre-wrap break-words">{notice.message}</p>

                    <p className="text-sm text-muted-foreground">
                      Julkaistu <DateTime value={notice.createdAt} format="numeric" />
                    </p>

                    {removed ? (
                      <p className="text-sm text-muted-foreground">
                        Poistettu näkyvistä{' '}
                        {notice.expiresAt && <DateTime value={notice.expiresAt} format="numeric" />}
                      </p>
                    ) : (
                      isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={removingId === notice.id}
                          onClick={() => removeNotice(notice.id)}
                        >
                          Poista näkyvistä
                        </Button>
                      )
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {activeReport && (
        <HandleNoticeDialog
          report={activeReport}
          reservations={activeReport.loan.reservations.map((r) => ({
            amount: r.amount,
            item: { id: r.item.id, name: r.item.name, amount: r.item.amount },
          }))}
          open={activeId !== null}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
        />
      )}
    </>
  );
}
