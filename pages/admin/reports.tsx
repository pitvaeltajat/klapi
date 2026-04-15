import React from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import prisma from '../../utils/prisma';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';
import Breadcrumbs from '../../components/Breadcrumbs';
import { Box as BoxType, Item, Reservation, Loan, ReportAffectedItem } from '@prisma/client';
import { GetServerSideProps } from 'next';
import { serialize } from '@/utils/serialize';
import { Badge } from '@/components/ui/badge';

interface ReportsPageProps {
  reports: {
    id: string;
    content: string;
    createdAt: Date;
    created: string;
    loanId: string;
    status: string;
    loan: Loan & {
      reservations: (Reservation & { item: Item })[];
      box: BoxType;
      user: { name: string };
    };
    affectedItems: (ReportAffectedItem & { item: Item })[];
  }[];
}

export const getServerSideProps: GetServerSideProps = async () => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      loan: {
        include: {
          reservations: { include: { item: true } },
          box: true,
          user: true,
        },
      },
      affectedItems: { include: { item: true } },
    },
  });
  return { props: serialize({ reports }) };
};

export default function ReportsPage({ reports }: ReportsPageProps) {
  const { data: session } = useSession();

  if (session?.user?.group !== 'ADMIN') return <NotAuthenticated />;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
      <Head>
        <title>Raportit | Klapi</title>
      </Head>
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
                  <strong>Luotu:</strong> {formatDate(new Date(report.createdAt))}
                  {report.created === 'AFTER_LOAN'
                    ? ' (Lainauksen jälkeen)'
                    : ' (Ennen lainausta)'}
                </p>
                <p>
                  <strong>Sisältö:</strong>{' '}
                  {report.content.length > 200
                    ? report.content.substring(0, 200) + '...'
                    : report.content}
                </p>
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
