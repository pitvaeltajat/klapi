'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReportAffectedItem } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateNumeric } from '@/utils/dateFormat';

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
      <h1 className="mb-4 text-4xl font-semibold">Raportit</h1>

      <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="mb-1 font-semibold">Mitä raportit ovat?</p>
        <p className="text-muted-foreground">
          Raportit ovat lainaajien tekemiä ilmoituksia kamojen kunnosta tai puutteista lainan
          alussa tai sen päättyessä. Käsittelemättömät raportit näkyvät ylimpänä. Avaa raporttiin
          liittyvä laina linkistä, jossa voit ottaa raportin käsittelyyn, lähettää ilmoituksen
          kamasta tai merkitä raportin ratkaistuksi.
        </p>
      </div>

      {sortedReports.length === 0 ? (
        <div className="rounded-md bg-muted p-6 text-center">
          <p className="text-muted-foreground">Ei raportteja</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">Tila</TableHead>
                <TableHead className="w-[170px]">Luotu</TableHead>
                <TableHead>Sisältö</TableHead>
                <TableHead>Vaikuttaa kamoihin</TableHead>
                <TableHead className="w-[220px]">Laina</TableHead>
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
