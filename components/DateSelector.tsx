'use client';

import React, { useState } from 'react';
import { useDates } from '@/contexts/DatesContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import LoanRangeCalendar from '@/components/LoanRangeCalendar';
import type { DateRange } from '@/utils/dateRange';

// Initial loan-time selection. Once both dates are picked the home page swaps
// this out for the catalogue (ItemBrowser) with a compact DateSummaryBar; this
// component is only mounted while no range has been chosen yet.
export default function DateSelector() {
  const { setStartDate, setEndDate, setDatesSet, setBrowseMode } = useDates();

  const [dateRange, setDateRange] = useState<DateRange>([null, null]);

  // Picking a range no longer empties the cart — a basket restored after a
  // reload has to survive re-choosing the dates. Amounts that don't fit the new
  // range are caught in the cart drawer instead.
  const handleRangeChange = (next: DateRange) => {
    setDateRange(next);
    if (next[0] && next[1]) {
      setStartDate(next[0]);
      setEndDate(next[1]);
      setDatesSet(true);
    }
  };

  return (
    // Centred rather than left-aligned: the catalogue route runs full width, so
    // a left-hugging card would sit alone in a very wide page.
    <div className="mx-auto mb-4 flex max-w-3xl flex-col gap-4">
      <div>
        <h2 className="mb-2 text-xl font-semibold">Aloitus</h2>
        <p className="text-muted-foreground">
          Aloita valitsemalla kamojen nouto- ja palautusajankohdat.
        </p>
      </div>

      <Card padding="md">
        <Label size="section">Valitse lainausaika</Label>
        <LoanRangeCalendar
          className="mt-2"
          value={dateRange}
          onChange={handleRangeChange}
          minDate={new Date()}
        />
        <Button variant="outline" className="mt-4 w-full" onClick={() => setBrowseMode(true)}>
          Selaa katalogia ilman lainaa
        </Button>
      </Card>
    </div>
  );
}
