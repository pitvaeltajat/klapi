'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReportAffectedItem } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { formatDateNumeric } from '@/utils/dateFormat';

const CONTENT_PREVIEW_LENGTH = 200;

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

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Raportit' }]} />
      <h1 className="mb-6 text-4xl font-semibold">Raportit</h1>

      {reports.length === 0 ? (
        <div className="rounded-md bg-muted p-6 text-center">
          <p className="text-muted-foreground">Ei raportteja</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="rounded-md border p-5 shadow-md">
              <div className="flex flex-col gap-3">
                <div className="flex w-full items-center justify-between">
                  <p className="text-lg font-bold">Raportti ID: {report.id}</p>
                  <Badge variant={statusVariant(report.status)}>{statusLabel(report.status)}</Badge>
                </div>
                <hr />
                <p>
                  <strong>Luotu:</strong> {formatDateNumeric(report.createdAt)}
                  {report.created === 'AFTER_LOAN'
                    ? ' (Lainauksen jälkeen)'
                    : ' (Ennen lainausta)'}
                </p>
                <div>
                  <strong>Sisältö:</strong>{' '}
                  {report.content.length > CONTENT_PREVIEW_LENGTH ? (
                    <>
                      <p className="mt-1 whitespace-pre-wrap break-words">
                        {expanded.has(report.id)
                          ? report.content
                          : report.content.substring(0, CONTENT_PREVIEW_LENGTH) + '…'}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleExpanded(report.id)}
                        className="mt-1 text-sm text-primary hover:underline"
                        aria-expanded={expanded.has(report.id)}
                      >
                        {expanded.has(report.id) ? 'Näytä vähemmän' : 'Näytä koko raportti'}
                      </button>
                    </>
                  ) : (
                    <span className="whitespace-pre-wrap break-words">{report.content}</span>
                  )}
                </div>
                {report.affectedItems.length > 0 && (
                  <div>
                    <p className="mb-2 font-bold">Kamat joihin raportti vaikuttaa:</p>
                    <ul className="list-disc pl-6">
                      {report.affectedItems.map((item) => (
                        <li key={item.id}>
                          {item.item.name} - Määrä: {item.amount}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <NextLink href={`/loan/${report.loanId}`} className="text-primary hover:underline">
                  Liittyy {report.loan.loaner || report.loan.user.name} tekemään lainaan{' '}
                  {report.loan.description}
                </NextLink>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
