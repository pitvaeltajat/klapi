'use client';

import React from 'react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReservationStatus } from '@prisma/client';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '@/utils/loanHelpers';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/utils/dateFormat';

interface LoanWithReservations extends Loan {
  reservations: (Reservation & { item: Item })[];
}

interface BoxWithLoans extends BoxType {
  loans: LoanWithReservations[];
}

interface BoxesViewProps {
  boxes: BoxWithLoans[];
  reports: { id: string; content: string; createdAt: Date | string; loanId: string; status: string }[];
}

export default function BoxesView({ boxes, reports }: BoxesViewProps) {
  const { data: session } = useSession();

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const getDerivedStatus = (loan: LoanWithReservations) =>
    deriveLoanStatus(loan.reservations, loan.status);

  const hasReports = (loanId: string) =>
    reports.some((report) => report.loanId === loanId && report.status !== 'RESOLVED');

  return (
    <>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Laatikot' }]} />
      <h1 className="mb-6 text-3xl font-semibold">Laatikot</h1>

      {boxes.length === 0 ? (
        <div className="rounded-lg border bg-muted p-8 text-center">
          <p className="text-lg text-muted-foreground">Ei laatikkoja</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {boxes.map((box) => (
            <div
              key={box.id}
              className="rounded-xl border-2 bg-card p-6 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="mb-2 text-lg font-semibold">{box.name}</h2>
                  {box.description && (
                    <p className="text-sm text-muted-foreground">{box.description}</p>
                  )}
                </div>

                <hr />

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold">Lainat</p>
                    <Badge>{box.loans.length}</Badge>
                  </div>

                  {box.loans.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">Ei lainoja</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {box.loans.map((loan) => (
                        <NextLink key={loan.id} href={`/loan/${loan.id}`}>
                          <div className="rounded-md border bg-muted p-3 transition-all hover:border-primary/50 hover:bg-muted/80">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">
                                  {loan.description || 'Ei kuvausta'}
                                </p>
                                <Badge variant={getLoanStatusColor(getDerivedStatus(loan))}>
                                  {getLoanStatusLabel(getDerivedStatus(loan))}
                                </Badge>
                              </div>
                              {hasReports(loan.id) && (
                                <Badge variant="destructive" className="self-end">
                                  Raportteja:{' '}
                                  {
                                    reports.filter(
                                      (r) => r.loanId === loan.id && r.status !== 'RESOLVED',
                                    ).length
                                  }
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {loan.reservations
                                  .filter((r) => r.status === ReservationStatus.IN_BOX)
                                  .map((r) => `${r.item.name} (${r.amount})`)
                                  .join(', ')}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateOnly(loan.startTime)} -{' '}
                                {formatDateOnly(loan.endTime)}
                              </p>
                            </div>
                          </div>
                        </NextLink>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
