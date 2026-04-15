import React from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import prisma from '../../utils/prisma';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReservationStatus } from '@prisma/client';
import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '../../utils/loanHelpers';
import { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import { Badge } from '@/components/ui/badge';

interface LoanWithReservations extends Loan {
  reservations: (Reservation & { item: Item })[];
}

interface BoxWithLoans extends BoxType {
  loans: LoanWithReservations[];
}

interface BoxesPageProps {
  boxes: BoxWithLoans[];
  reports: { id: string; content: string; createdAt: Date; loanId: string; status: string }[];
}

export const getServerSideProps: GetServerSideProps<BoxesPageProps> = async () => {
  const boxes = await prisma.box.findMany({
    include: {
      loans: {
        include: { reservations: { include: { item: true } } },
        where: { reservations: { some: { status: ReservationStatus.IN_BOX } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  const reports = await prisma.report.findMany();
  return { props: serialize({ boxes, reports }) };
};

export default function BoxesPage({ boxes, reports }: BoxesPageProps) {
  const { data: session } = useSession();

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const getDerivedStatus = (loan: LoanWithReservations) =>
    deriveLoanStatus(loan.reservations, loan.status);

  const hasReports = (loanId: string) =>
    reports.some((report) => report.loanId === loanId && report.status !== 'RESOLVED');

  return (
    <>
      <Head>
        <title>Laatikot | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Laatikot' }]} />
      <h1 className="mb-6 text-4xl font-semibold">Laatikot</h1>

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
                    <p className="text-sm font-semibold">Varaukset</p>
                    <Badge>{box.loans.length}</Badge>
                  </div>

                  {box.loans.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">Ei varauksia</p>
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
                                {new Date(loan.startTime).toLocaleDateString('fi-FI')} -{' '}
                                {new Date(loan.endTime).toLocaleDateString('fi-FI')}
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
