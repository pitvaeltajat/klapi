'use client';

import React from 'react';
import { Reservation } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardTitle } from '@/components/ui/card';
import { DateTime } from '@/components/DateTime';
import HandleReportDialog from '@/components/HandleReportDialog';

interface Report {
  id: string;
  content: string;
  createdAt: string | Date;
  status: string;
}

interface ReservationWithItem extends Reservation {
  item: {
    id: string;
    name: string;
    amount: number;
  };
}

interface ReportCardProps {
  reports: Report[];
  reservations: ReservationWithItem[];
}

const STATUS_ORDER: Record<string, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
};

const ReportCard: React.FC<ReportCardProps> = ({ reports, reservations }) => {
  const [activeReportId, setActiveReportId] = React.useState<string | null>(null);
  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  const unresolvedReports = reports.filter((r) => r.status !== 'RESOLVED');
  const sortedReports = [...reports].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const statusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'gray' => {
    if (status === 'IN_PROGRESS') return 'warning';
    if (status === 'RESOLVED') return 'success';
    return 'gray';
  };

  const statusLabel = (status: string) => {
    if (status === 'IN_PROGRESS') return 'Käsittelyssä';
    if (status === 'RESOLVED') return 'Ratkaistu';
    return 'Käsittelemättä';
  };

  return (
    <Card>
      <CardTitle>
        Raportit {unresolvedReports.length > 0 ? `(${unresolvedReports.length})` : ''}
      </CardTitle>
      <div className="flex flex-col gap-3">
        {sortedReports.map((report) => (
          <Card key={report.id} variant="muted" padding="md">
            <div className="mb-2 flex items-start justify-between gap-2">
              <Badge variant={statusVariant(report.status)}>
                {statusLabel(report.status)}
              </Badge>
              <DateTime
                value={report.createdAt}
                format="numeric"
                className="text-xs text-muted-foreground"
              />
            </div>
            <p className="whitespace-pre-wrap text-sm">{report.content}</p>
            {report.status !== 'RESOLVED' && (
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setActiveReportId(report.id)}
              >
                Käsittele
              </Button>
            )}
          </Card>
        ))}
      </div>

      {activeReport && (
        <HandleReportDialog
          report={activeReport}
          reservations={reservations.map((r) => ({
            amount: r.amount,
            item: {
              id: r.item.id,
              name: r.item.name,
              amount: r.item.amount,
            },
          }))}
          open={activeReportId !== null}
          onOpenChange={(open) => {
            if (!open) setActiveReportId(null);
          }}
        />
      )}
    </Card>
  );
};

export default ReportCard;
