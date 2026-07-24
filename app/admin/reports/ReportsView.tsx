'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReportAffectedItem } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateNumeric } from '@/utils/dateFormat';
import HandleReportDialog from '@/components/HandleReportDialog';

const CONTENT_PREVIEW_LENGTH = 200;

const STATUS_ORDER: Record<string, number> = {
  OPEN: 0,
  IN_PROGRESS: 1,
  RESOLVED: 2,
};

interface ReportsViewProps {
  reports: {
    id: string;
    content: string;
    createdAt: Date | string;
    created: string;
    loanId: string;
    status: string;
    loan: Loan & {
      reservations: (Reservation & { item: Item })[];
      box: BoxType | null;
      user: { name: string | null };
    };
    affectedItems: (ReportAffectedItem & { item: Item })[];
  }[];
}

export default function ReportsView({ reports }: ReportsViewProps) {
  const { data: session } = useSession();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const activeReport = reports.find((r) => r.id === activeReportId) ?? null;

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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

  const sortedReports = [...reports].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Raportit' }]} />
      <PageHeader title="Raportit" />

      <Alert variant="info" title="Mitä raportit ovat?" className="mb-6">
        Raportit ovat lainaajien tekemiä ilmoituksia kamojen kunnosta tai puutteista lainan
        alussa tai sen päättyessä. Käsittelemättömät raportit näkyvät ylimpänä. Paina{' '}
        <strong>Käsittele</strong> ottaaksesi raportin käsittelyyn, lähettääksesi ilmoituksen
        kamasta tai merkitäksesi raportin ratkaistuksi — tai avaa raporttiin liittyvä laina
        linkistä.
      </Alert>

      {sortedReports.length === 0 ? (
        <EmptyState title="Ei raportteja" />
      ) : (
        <>
          {/* Mobile: stacked cards — a 5-column table does not fit a phone. */}
          <div className="flex flex-col gap-3 md:hidden">
            {sortedReports.map((report) => {
              const isExpanded = expanded.has(report.id);
              const isLong = report.content.length > CONTENT_PREVIEW_LENGTH;
              const displayed =
                !isLong || isExpanded
                  ? report.content
                  : report.content.substring(0, CONTENT_PREVIEW_LENGTH) + '…';
              return (
                <Card key={report.id} padding="md" className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusVariant(report.status)}>
                      {statusLabel(report.status)}
                    </Badge>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>{formatDateNumeric(report.createdAt)}</div>
                      <div>
                        {report.created === 'AFTER_LOAN'
                          ? 'Lainauksen jälkeen'
                          : 'Ennen lainausta'}
                      </div>
                    </div>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm">{displayed}</p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(report.id)}
                      className="self-start text-xs text-primary hover:underline"
                      aria-expanded={isExpanded}
                    >
                      {isExpanded ? 'Näytä vähemmän' : 'Näytä koko raportti'}
                    </button>
                  )}
                  {report.affectedItems.length > 0 && (
                    <div className="text-sm">
                      <p className="font-medium">Vaikuttaa kamoihin:</p>
                      <ul className="list-disc pl-5">
                        {report.affectedItems.map((item) => (
                          <li key={item.id}>
                            {item.item.name} ({item.amount} kpl)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <NextLink
                    href={`/loan/${report.loanId}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {report.loan.loaner || report.loan.user.name}
                    {report.loan.description ? ` — ${report.loan.description}` : ''}
                  </NextLink>
                  {report.status !== 'RESOLVED' && (
                    <Button
                      size="sm"
                      className="self-start"
                      onClick={() => setActiveReportId(report.id)}
                    >
                      Käsittele
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Desktop: full table. */}
          <Card padding="none" className="hidden md:block">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Tila</TableHead>
                <TableHead className="w-[170px]">Luotu</TableHead>
                <TableHead>Sisältö</TableHead>
                <TableHead>Vaikuttaa kamoihin</TableHead>
                <TableHead className="w-[220px]">Laina</TableHead>
                <TableHead className="w-[120px]">Toiminnot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedReports.map((report) => {
                const isExpanded = expanded.has(report.id);
                const isLong = report.content.length > CONTENT_PREVIEW_LENGTH;
                const displayed =
                  !isLong || isExpanded
                    ? report.content
                    : report.content.substring(0, CONTENT_PREVIEW_LENGTH) + '…';
                return (
                  <TableRow key={report.id} className="align-top">
                    <TableCell>
                      <Badge variant={statusVariant(report.status)}>
                        {statusLabel(report.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      <div>{formatDateNumeric(report.createdAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        {report.created === 'AFTER_LOAN'
                          ? 'Lainauksen jälkeen'
                          : 'Ennen lainausta'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-pre-wrap break-words">{displayed}</p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(report.id)}
                          className="mt-1 text-xs text-primary hover:underline"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? 'Näytä vähemmän' : 'Näytä koko raportti'}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {report.affectedItems.length === 0 ? (
                        <span className="text-sm text-muted-foreground">—</span>
                      ) : (
                        <ul className="list-disc pl-5 text-sm">
                          {report.affectedItems.map((item) => (
                            <li key={item.id}>
                              {item.item.name} ({item.amount} kpl)
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                    <TableCell>
                      <NextLink
                        href={`/loan/${report.loanId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {report.loan.loaner || report.loan.user.name}
                        {report.loan.description ? ` — ${report.loan.description}` : ''}
                      </NextLink>
                    </TableCell>
                    <TableCell>
                      {report.status !== 'RESOLVED' && (
                        <Button size="sm" onClick={() => setActiveReportId(report.id)}>
                          Käsittele
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Card>
        </>
      )}

      {activeReport && (
        <HandleReportDialog
          report={activeReport}
          reservations={activeReport.loan.reservations.map((r) => ({
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
    </>
  );
}
