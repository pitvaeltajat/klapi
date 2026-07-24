'use client';

import NextLink from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { formatDateOnly } from '@/utils/dateFormat';

interface PendingPickupLoan {
  id: string;
  description: string | null;
  startTime: string;
  itemCount: number;
}

/**
 * Surfaces the signed-in user's approved-but-not-started loans whose pickup
 * time has passed, nudging them to mark the loan in use ("Aloita lainaus").
 * Renders nothing when there is nothing to nudge about.
 */
export default function PendingPickupBanner() {
  const { status } = useSession();
  const { data } = useSWR<{ loans: PendingPickupLoan[] }>(
    status === 'authenticated' ? '/api/loan/myPendingPickups' : null,
  );

  const loans = data?.loans ?? [];
  if (loans.length === 0) return null;

  const single = loans.length === 1 ? loans[0] : null;

  return (
    <Alert
      variant="warning"
      className="mb-6 sm:items-center"
      icon={<PackageCheck className="mt-0.5 h-6 w-6 shrink-0 text-warning" />}
      title={
        single ? 'Sinulla on noutamaton laina' : `Sinulla on ${loans.length} noutamatonta lainaa`
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <p className="flex-1">
          {single ? (
            <>
              {single.description ? `"${single.description}" — ` : ''}
              noutoaika alkoi {formatDateOnly(single.startTime)}. Jos olet hakenut tavarat
              varastosta, merkitse laina käyttöön.
            </>
          ) : (
            'Jos olet hakenut tavarat varastosta, merkitse lainat käyttöön.'
          )}
        </p>
        <Button asChild variant="warning" className="shrink-0">
          <NextLink href={single ? `/loan/${single.id}` : '/loan'}>
            {single ? 'Aloita lainaus' : 'Näytä lainat'}
          </NextLink>
        </Button>
      </div>
    </Alert>
  );
}
