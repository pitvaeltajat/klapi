'use client';

import NextLink from 'next/link';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="mb-6 flex flex-col gap-3 rounded-lg border-2 border-warning/50 bg-warning/10 p-4 sm:flex-row sm:items-center">
      <PackageCheck className="h-6 w-6 shrink-0 text-warning" />
      <div className="flex-1">
        <p className="font-semibold text-warning">
          {single
            ? 'Sinulla on noutamaton laina'
            : `Sinulla on ${loans.length} noutamatonta lainaa`}
        </p>
        <p className="text-sm text-muted-foreground">
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
      </div>
      <Button asChild variant="warning" className="shrink-0">
        <NextLink href={single ? `/loan/${single.id}` : '/loan'}>
          {single ? 'Aloita lainaus' : 'Näytä lainat'}
        </NextLink>
      </Button>
    </div>
  );
}
