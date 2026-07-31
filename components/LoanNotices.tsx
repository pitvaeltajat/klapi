'use client';

import React from 'react';
import { Reservation } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { DateTime } from '@/components/DateTime';
import HandleNoticeDialog, { type NoticeReport } from '@/components/HandleNoticeDialog';
import {
  getReportStatusLabel,
  getReportStatusColor,
  getReportCreatedLabel,
} from '@/utils/loanHelpers';

interface ReservationWithItem extends Reservation {
  item: { id: string; name: string; amount: number };
}

interface LoanNoticesProps {
  reports: NoticeReport[];
  reservations: ReservationWithItem[];
  /** Admins triage from here; the loaner only reads back what they wrote. */
  isAdmin: boolean;
}

const STATUS_ORDER: Record<string, number> = { OPEN: 0, IN_PROGRESS: 1, RESOLVED: 2 };

/**
 * The huomiot written during this loan. Loaners see their own — they are asked
 * to write these under a liability warning, so getting no acknowledgement that
 * anyone received them was the wrong end of that bargain.
 */
const LoanNotices: React.FC<LoanNoticesProps> = ({ reports, reservations, isAdmin }) => {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const activeReport = reports.find((r) => r.id === activeId) ?? null;

  const unresolved = reports.filter((r) => r.status !== 'RESOLVED');
  const sorted = [...reports].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (byStatus !== 0) return byStatus;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Card as="section">
      <CardTitle>Huomiot {unresolved.length > 0 ? `(${unresolved.length})` : ''}</CardTitle>

      <p className="mb-3 text-sm text-muted-foreground">
        {isAdmin
          ? 'Lainaajan kirjaamat huomiot kamojen kunnosta. Käsittele ne ja julkaise tarvittaessa lainaajille näkyväksi.'
          : 'Kirjaamasi huomiot kamojen kunnosta. Ylläpito käy ne läpi.'}
      </p>

      <div className="flex flex-col gap-3">
        {sorted.map((report) => (
          <Card key={report.id} variant="muted" padding="md">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant={getReportStatusColor(report.status)}>
                {getReportStatusLabel(report.status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {getReportCreatedLabel(report.created)}
                {' · '}
                <DateTime value={report.createdAt} format="numeric" />
              </span>
              {(report.announcements?.length ?? 0) > 0 && (
                <Badge variant="secondary">Julkaistu</Badge>
              )}
            </div>
            <p className="whitespace-pre-wrap text-sm">{report.content}</p>
            {isAdmin && report.status !== 'RESOLVED' && (
              <Button size="sm" className="mt-3" onClick={() => setActiveId(report.id)}>
                Käsittele
              </Button>
            )}
          </Card>
        ))}
      </div>

      {isAdmin && activeReport && (
        <HandleNoticeDialog
          report={activeReport}
          reservations={reservations.map((r) => ({
            amount: r.amount,
            item: { id: r.item.id, name: r.item.name, amount: r.item.amount },
          }))}
          open={activeId !== null}
          onOpenChange={(open) => {
            if (!open) setActiveId(null);
          }}
        />
      )}
    </Card>
  );
};

export default LoanNotices;
