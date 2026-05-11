'use client';

import { LoanStatus } from '@prisma/client';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import useSWR from 'swr';
import NotAuthenticated from '@/components/NotAuthenticated';
import LoadingSpinner from '@/components/LoadingSpinner';
import Breadcrumbs from '@/components/Breadcrumbs';
import LoanCard, { LoanType } from '@/components/LoanCard';
import { getLoanStatusLabel, deriveLoanStatus } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';

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
  if (error) return <p className="text-destructive">Virhe ladattaessa lainoja</p>;

  if (!loans || loans.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-semibold">Ei lainoja</h1>
        <Button asChild className="mt-4">
          <NextLink href="/">Luo laina etusivulla</NextLink>
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
      <Breadcrumbs items={[{ label: 'Lainat' }]} />
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-3xl font-semibold">Lainat</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAllStatuses}
              aria-pressed={allChecked}
              className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                allChecked
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              Kaikki
            </button>
            {allStatuses.map((status) => {
              const active = selectedStatuses.has(status);
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-background text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {getStatusFilterLabel(status)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredLoans.map((loan) => (
            <LoanCard key={loan.id} loan={loan as LoanType} />
          ))}
        </div>
      </div>
    </>
  );
}
