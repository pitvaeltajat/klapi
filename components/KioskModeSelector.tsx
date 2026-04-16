'use client';

import React from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function KioskModeSelector() {
  const { setStartDate, setEndDate, setDatesSet } = useDates();
  const router = useRouter();

  const handleLoanClick = () => {
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    oneWeekLater.setHours(18, 0, 0, 0);

    setStartDate(now);
    setEndDate(oneWeekLater);
    setDatesSet(true);
  };

  return (
    <div className="mx-auto mt-8 max-w-[500px] p-6">
      <div className="flex flex-col gap-6">
        <h1 className="mb-3 text-3xl font-semibold">Tervetuloa kalustoon!</h1>
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-5 text-base leading-relaxed shadow-xs text-foreground/90">
          <p className="mb-3">
            Merkkaa Klapiin jokainen tavara jonka lainaat. Jos tavara ei löydy Klapista, voit lisätä
            sen itse varauksen yhteydessä.
          </p>
          <p className="mb-3">Palauta tavarat sovittuna ajankohtana hyvässä kunnossa.</p>
          <p>
            Mikäli sinulle tulee jotain kysyttävää, ota yhteyttä kalustonhoitajaan: 044 987 7397
          </p>
        </div>

        <div className="flex gap-4">
          <Button size="lg" onClick={handleLoanClick} className="flex-1">
            Lainaa
          </Button>
          <Button
            size="lg"
            variant="success"
            onClick={() => router.push('/kiosk/return')}
            className="flex-1"
          >
            Palauta
          </Button>
        </div>
        <Button variant="outline" onClick={() => router.push('/kiosk/startloan')}>
          Merkkaa ennakkoon tehty varaus noudetuksi
        </Button>
      </div>
    </div>
  );
}
