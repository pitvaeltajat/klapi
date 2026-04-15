import { LoanStatus, ReportCreated, ReportStatus, ReservationStatus } from '@prisma/client';
import Head from 'next/head';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import NotAuthenticated from '../../components/NotAuthenticated';
import LoadingSpinner from '../../components/LoadingSpinner';
import Breadcrumbs from '../../components/Breadcrumbs';
import { getLoanStatusLabel, getLoanStatusColor, deriveLoanStatus } from '../../utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  loaner: string | null;
  startTime: Date;
  endTime: Date;
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
    createdAt: Date;
    created: ReportCreated;
    status: ReportStatus;
  }[];
}

export const LoanCard = ({ loan }: { loan: LoanType }) => {
  const formatDate = (date: Date) =>
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
};

const getStatusFilterLabel = (status: LoanStatus): string => {
  const label = getLoanStatusLabel(status);
  if (label === 'Hyväksytty') return 'Hyväksytyt';
  if (label === 'Hylätty') return 'Hylätyt';
  if (label === 'Palautettu') return 'Palautetut';
  return label;
};

function compareDates(dateA: Date, dateB: Date) {
  return dateB.getTime() - dateA.getTime();
}

export default function LoanList() {
  const { data: session } = useSession();
  const { data: loans, error, isLoading } = useSWR<LoanType[]>('/api/loan/getLoansClient');
  const allStatuses = Object.values(LoanStatus);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<LoanStatus>>(
    new Set([
      LoanStatus.ACCEPTED,
      LoanStatus.IN_BOX,
      LoanStatus.INUSE,
      LoanStatus.PARTIALLY_RETURNED,
    ]),
  );

  const allChecked = selectedStatuses.size === allStatuses.length;
  const isIndeterminate = selectedStatuses.size > 0 && !allChecked;

  if (!session?.user) return <NotAuthenticated />;
  if (isLoading) return <LoadingSpinner fullWidth />;
  if (error) return <p className="text-destructive">Virhe ladattaessa varauksia</p>;

  if (!loans || loans.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-semibold">Ei varauksia</h1>
        <Button asChild className="mt-4">
          <NextLink href="/">Luo varaus etusivulla</NextLink>
        </Button>
      </div>
    );
  }

  const sortedLoans = [...loans].sort((a, b) =>
    compareDates(new Date(a.startTime), new Date(b.startTime)),
  );

  const toggleAllStatuses = () => {
    if (allChecked || isIndeterminate) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(allStatuses));
    }
  };

  const toggleStatus = (status: LoanStatus) => {
    const newStatuses = new Set(selectedStatuses);
    if (newStatuses.has(status)) newStatuses.delete(status);
    else newStatuses.add(status);
    setSelectedStatuses(newStatuses);
  };

  const filteredLoans = sortedLoans.filter((loan) => {
    if (selectedStatuses.size === 0) return true;
    const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
    return selectedStatuses.has(derivedStatus);
  });

  return (
    <>
      <Head>
        <title>Varaukset | Klapi</title>
      </Head>
      <Breadcrumbs items={[{ label: 'Varaukset' }]} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="mb-4 text-3xl font-semibold">Varaukset</h1>
          <div className="py-4">
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                  onChange={toggleAllStatuses}
                />
                Kaikki
              </label>
              <div className="flex flex-col gap-2 pl-6">
                {allStatuses.map((status) => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.has(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    {getStatusFilterLabel(status)}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredLoans.map((loan) => (
              <LoanCard key={loan.id} loan={loan} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
