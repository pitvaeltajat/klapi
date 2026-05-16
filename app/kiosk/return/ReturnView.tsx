'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { LoanStatus, ReservationStatus } from '@prisma/client';
import NotAuthenticated from '@/components/NotAuthenticated';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useRouter } from 'next/navigation';

import { deriveLoanStatus, getLoanStatusLabel, getLoanStatusColor } from '@/utils/loanHelpers';
import { Badge } from '@/components/ui/badge';
import { formatDateOnly } from '@/utils/dateFormat';
import LoanReturnDialog from '@/components/LoanReturnDialog';

interface Reservation {
  id: string;
  amount: number;
  status: ReservationStatus;
  item: {
    id: string;
    name: string;
  };
}

interface LoanType {
  id: string;
  userId: string;
  status: LoanStatus;
  description: string | null;
  startTime: Date | string;
  endTime: Date | string;
  loaner: string | null;
  user: {
    name: string | null;
    email: string | null;
  };
  reservations: Reservation[];
}

const LoanReturnCard = ({
  loan,
  onReturnComplete,
}: {
  loan: LoanType;
  onReturnComplete: () => void;
}) => {
  const inuseReservations = loan.reservations.filter(
    (r) => r.status === ReservationStatus.INUSE,
  );
  const derivedStatus = deriveLoanStatus(loan.reservations, loan.status);

  return (
    <div className="mb-4 overflow-hidden rounded-lg border p-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">{loan.description || loan.loaner}</h3>
        <Badge variant={getLoanStatusColor(derivedStatus)} className="w-fit">
          {getLoanStatusLabel(derivedStatus)}
        </Badge>
        <p>Lainaaja: {loan.loaner}</p>
        <p>
          Laina-aika: {formatDateOnly(loan.startTime)} - {formatDateOnly(loan.endTime)}
        </p>
        <div>
          <p className="mb-2 font-bold">Tavarat (käytössä):</p>
          <div className="flex flex-wrap gap-2">
            {inuseReservations.map((reservation) => (
              <Badge key={reservation.id} className="rounded-full">
                {reservation.item.name} ({reservation.amount})
              </Badge>
            ))}
          </div>
        </div>
        <LoanReturnDialog
          loanId={loan.id}
          reservations={loan.reservations}
          onReturnComplete={onReturnComplete}
        />
      </div>
    </div>
  );
};

export default function ReturnView({ loans }: { loans: LoanType[] }) {
  const { data: session } = useSession();
  const router = useRouter();

  const handleReturnComplete = () => {
    router.push('/');
  };

  if (session?.user?.group !== 'KIOSK' && session?.user?.group !== 'ADMIN') {
    return <NotAuthenticated />;
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Palauta lainoja' }]} />
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="mb-4 text-3xl font-semibold">Palauta lainoja</h1>
          {loans.length === 0 ? (
            <div className="py-8 text-center">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Ei käytössä olevia lainoja
              </h2>
            </div>
          ) : (
            loans.map((loan) => (
              <LoanReturnCard
                key={loan.id}
                loan={loan}
                onReturnComplete={handleReturnComplete}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
