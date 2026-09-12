'use client';

import React, { useState } from 'react';
import { useDates } from '@/contexts/DatesContext';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import LoanRangeCalendar from '@/components/LoanRangeCalendar';
import type { DateRange } from '@/utils/dateRange';

// Initial loan-time selection. Once both dates are picked the home page swaps
// this out for the catalogue (ItemBrowser) with a compact DateSummaryBar; this
// component is only mounted while no range has been chosen yet.
export default function DateSelector() {
  const { setStartDate, setEndDate, setDatesSet } = useDates();

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
      <h2 className="text-xl font-semibold">Aloitus</h2>

      <Card padding="md">
        <Label size="section">Valitse lainausaika</Label>
        {/* No "selaa katalogia" escape hatch here: the top bar's Kamat entry is
            the way into browse mode, and a second door on the one screen whose
            job is picking the dates only made that job look optional. */}
        <LoanRangeCalendar
          className="mt-2"
          value={dateRange}
          onChange={handleRangeChange}
          minDate={new Date()}
        />
      </Card>
    </div>
  );
}
