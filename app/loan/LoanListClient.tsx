'use client';

import { LoanStatus } from '@prisma/client';
import NextLink from 'next/link';
import { useState } from 'react';
import Breadcrumbs from '@/components/Breadcrumbs';
import LoanCard, { LoanType } from '@/components/LoanCard';
import { getLoanStatusLabel, deriveLoanStatus } from '@/utils/loanHelpers';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';

const getStatusFilterLabel = (status: LoanStatus): string => {
  const label = getLoanStatusLabel(status);
  if (label === 'Hyväksytty') return 'Hyväksytyt';
  if (label === 'Hylätty') return 'Hylätyt';
  if (label === 'Peruttu') return 'Perutut';
  if (label === 'Palautettu') return 'Palautetut';
  return label;
};

/** How many loan cards to render at once — the rest are a click away. */
const PAGE_SIZE = 20;

export default function LoanListClient({ loans }: { loans: LoanType[] }) {
  const allStatuses = Object.values(LoanStatus);
  const [selectedStatuses, setSelectedStatuses] = useState<Set<LoanStatus>>(
    new Set([
      LoanStatus.ACCEPTED,
      LoanStatus.IN_BOX,
      LoanStatus.INUSE,
      LoanStatus.PARTIALLY_RETURNED,
    ]),
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const allChecked = selectedStatuses.size === allStatuses.length;
  const isIndeterminate = selectedStatuses.size > 0 && !allChecked;

  if (!loans || loans.length === 0) {
    return (
      <EmptyState
        title="Ei lainoja"
        action={
          <Button asChild>
            <NextLink href="/">Luo laina etusivulla</NextLink>
          </Button>
        }
      />
    );
  }

  const toggleAllStatuses = () => {
    setVisibleCount(PAGE_SIZE);
    if (allChecked || isIndeterminate) {
      setSelectedStatuses(new Set());
    } else {
      setSelectedStatuses(new Set(allStatuses));
    }
  };

  const toggleStatus = (status: LoanStatus) => {
    setVisibleCount(PAGE_SIZE);
    const newStatuses = new Set(selectedStatuses);
    if (newStatuses.has(status)) newStatuses.delete(status);
    else newStatuses.add(status);
    setSelectedStatuses(newStatuses);
  };

  const filteredLoans = loans.filter((loan) => {
    if (selectedStatuses.size === 0) return true;
    const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);
    return selectedStatuses.has(derivedStatus);
  });

  return (
    <>
      <Breadcrumbs items={[{ label: 'Lainat' }]} />
      <div className="flex flex-col gap-6">
        <PageHeader
          className="mb-0"
          title="Lainat"
          actionsAlign="inline"
          actions={
            <>
              <FilterChip active={allChecked} onClick={toggleAllStatuses}>
                Kaikki
              </FilterChip>
              {allStatuses.map((status) => (
                <FilterChip
                  key={status}
                  active={selectedStatuses.has(status)}
                  onClick={() => toggleStatus(status)}
                >
                  {getStatusFilterLabel(status)}
                </FilterChip>
              ))}
            </>
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredLoans.slice(0, visibleCount).map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
        {filteredLoans.length > visibleCount && (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Näytetään {visibleCount} / {filteredLoans.length} lainaa
            </p>
            <Button variant="outline" onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              Näytä lisää
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
