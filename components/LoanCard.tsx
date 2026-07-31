'use client';

import { LoanStatus, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import NextLink from 'next/link';
import { getLoanStatusLabel, getLoanStatusColor, deriveLoanStatus } from '@/utils/loanHelpers';
import { formatDateNumeric } from '@/utils/dateFormat';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  const unresolvedReports = loan.reports?.filter((r) => r.status !== 'RESOLVED') || [];
  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
  // A partially returned loan has kamat waiting in the box that its status
  // badge doesn't mention — say how many, so the "Laatikossa" filter's results
  // all explain themselves. When the status already reads "Laatikossa" the
  // whole loan is in there and the count would just repeat it.
  const inBoxCount =
    derivedStatus === LoanStatus.IN_BOX
      ? 0
      : loan.reservations.filter((r) => r.status === ReservationStatus.IN_BOX).length;
  const isOverdue =
    (derivedStatus === LoanStatus.INUSE || derivedStatus === LoanStatus.ACCEPTED) &&
    new Date(loan.endTime) < new Date();

  return (
    <Card
      padding="md"
      className={cn(
        'flex h-full flex-col gap-3 overflow-hidden',
        isOverdue && 'border-destructive/40 bg-destructive/10',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
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
        {inBoxCount > 0 && (
          <Badge variant="secondary" className="shrink-0">
            Laatikossa: {inBoxCount}
          </Badge>
        )}
        {unresolvedReports.length > 0 && (
          <Badge variant="destructive" className="shrink-0">
            Huomioita: {unresolvedReports.length}
          </Badge>
        )}
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground">
        <p>
          <span className="font-medium">Alku:</span> {formatDateNumeric(loan.startTime)}
        </p>
        <p>
          <span className="font-medium">Loppu:</span> {formatDateNumeric(loan.endTime)}
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
    </Card>
  );
}
