'use client';

import { LoanStatus, ReservationStatus } from '@prisma/client';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import NotAuthenticated from '@/components/NotAuthenticated';
import LoadingSpinner from '@/components/LoadingSpinner';
import Breadcrumbs from '@/components/Breadcrumbs';
import LoanCard from '@/components/LoanCard';
import { getLoanStatusLabel, deriveLoanStatus } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';

interface LoanType {
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
    created: string;
    status: string;
  }[];
}

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

export default function LoanListPage() {
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
              <LoanCard key={loan.id} loan={loan as any} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
