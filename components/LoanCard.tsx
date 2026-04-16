'use client';

import { LoanStatus, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import NextLink from 'next/link';
import { getLoanStatusLabel, getLoanStatusColor, deriveLoanStatus } from '@/utils/loanHelpers';
import { Badge } from '@/components/ui/badge';

export interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  loaner: string | null;
  startTime: Date | string;
  endTime: Date | string;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: {
    status: ReservationStatus;
    item: {
      id: string;
      name: string;
    };
  }[];
  reports: {
    id: string;
    content: string;
    createdAt: Date | string;
    created: ReportCreated;
    status: ReportStatus;
  }[];
}

export default function LoanCard({ loan }: { loan: LoanType }) {
  const formatDate = (date: Date | string) =>
    new Date(date).toLocaleString('fi-FI', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const unresolvedReports = loan.reports?.filter((r) => r.status !== 'RESOLVED') || [];
  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <h3 className="text-lg font-semibold">
            <NextLink href={`/loan/${loan.id}`} className="hover:underline">
              {loan.description || loan.loaner || loan.user.name}
            </NextLink>
          </h3>
          <p className="text-sm text-muted-foreground">
            Lainaaja: {loan.loaner || loan.user.name || loan.user.email}
          </p>
        </div>
        <Badge variant={getLoanStatusColor(derivedStatus)} className="shrink-0">
          {getLoanStatusLabel(derivedStatus)}
        </Badge>
        {unresolvedReports.length > 0 && (
          <Badge variant="destructive" className="shrink-0">
            Raportteja: {unresolvedReports.length}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Alku:</span> {formatDate(loan.startTime)}
        </p>
        <p>
          <span className="font-medium">Loppu:</span> {formatDate(loan.endTime)}
        </p>
      </div>

      {loan.reservations.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Kamat ({loan.reservations.length}):</p>
          <div className="flex flex-wrap gap-2">
            {loan.reservations.slice(0, 5).map((reservation) => (
              <Badge key={reservation.item.id} variant="default">
                {reservation.item.name}
              </Badge>
            ))}
            {loan.reservations.length > 5 && (
              <Badge variant="gray">+{loan.reservations.length - 5} lisää</Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
