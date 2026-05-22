'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import React, { useState } from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { applyRangeTimes } from '@/utils/dateRange';

// Initial loan-time selection. Once both dates are picked the home page swaps
// this out for the catalogue (ItemBrowser) with a compact DateSummaryBar; this
// component is only mounted while no range has been chosen yet.
export default function DateSelector() {
  const { setStartDate, setEndDate, setDatesSet, setBrowseMode } = useDates();
  const { clearCart } = useCart();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const handleRangeChange = (update: [Date | null, Date | null]) => {
    const next = applyRangeTimes(update[0], update[1]);
    setDateRange(next);
    if (next[0] && next[1]) {
      clearCart();
      setStartDate(next[0]);
      setEndDate(next[1]);
      setDatesSet(true);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div>
        <h2 className="mb-2 text-2xl font-semibold">Aloitus</h2>
        <p className="text-muted-foreground">
          Aloita valitsemalla kamojen nouto- ja palautusajankohdat.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 shadow-xs">
        <Label className="font-bold">Valitse lainausaika</Label>
        <div className="mt-2 flex justify-center">
          <DatePicker
            selected={startDate}
            onChange={handleRangeChange}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            swapRange
            inline
            minDate={new Date()}
            dateFormat="dd.MM.yyyy"
            calendarStartDay={1}
          />
        </div>
        <Button variant="outline" className="mt-4 w-full" onClick={() => setBrowseMode(true)}>
          Selaa katalogia ilman lainaa
        </Button>
      </div>
    </div>
  );
}
