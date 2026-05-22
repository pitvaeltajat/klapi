'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import React, { useState } from 'react';
import { CalendarDays, Pencil } from 'lucide-react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { formatDateShortWeekday, formatDateTimeKiosk } from '@/utils/dateFormat';
import { applyRangeTimes, setEndOfDay } from '@/utils/dateRange';

// Compact, always-visible summary of the chosen loan dates. Rendered inside the
// catalogue's sticky header so the picked days stay on screen while the item
// list fills the rest of the viewport. Editing happens in a dialog so the bar
// itself stays slim.
export default function DateSummaryBar() {
  const { state: dates, setStartDate, setEndDate, setDatesSet } = useDates();
  const { clearCart } = useCart();
  const [editOpen, setEditOpen] = useState(false);

  const handleEditChange = (update: [Date | null, Date | null]) => {
    const [nextStart, nextEnd] = applyRangeTimes(update[0], update[1]);
    if (nextStart) {
      setStartDate(nextStart);
      // New start with no end yet and it's past the current end → snap end to it.
      if (!nextEnd && nextStart > dates.endDate) {
        setEndDate(setEndOfDay(nextStart));
      }
    }
    if (nextEnd) {
      setEndDate(nextEnd);
    }
  };

  const handleReset = () => {
    clearCart();
    setEditOpen(false);
    setDatesSet(false);
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-1.5 text-sm sm:text-base">
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold">{formatDateShortWeekday(dates.startDate)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="font-semibold">{formatDateShortWeekday(dates.endDate)}</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" /> Muokkaa
      </Button>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Muokkaa lainausaikaa</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center overflow-x-auto">
            <DatePicker
              selected={dates.startDate}
              onChange={handleEditChange}
              startDate={dates.startDate}
              endDate={dates.endDate}
              selectsRange
              swapRange
              inline
              minDate={new Date()}
              dateFormat="dd.MM.yyyy"
              calendarStartDay={1}
            />
          </div>
          <div className="flex flex-col gap-1.5 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold">Nouto:</span>
              <span>{formatDateTimeKiosk(dates.startDate)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-bold">Palautus:</span>
              <span>{formatDateTimeKiosk(dates.endDate)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleReset}>
              Nollaa päivät
            </Button>
            <Button onClick={() => setEditOpen(false)}>Valmis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
