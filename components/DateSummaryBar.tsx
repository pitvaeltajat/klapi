'use client';

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
import LoanRangeCalendar from '@/components/LoanRangeCalendar';
import { formatDateShortWeekday } from '@/utils/dateFormat';
import type { DateRange } from '@/utils/dateRange';

// Compact, always-visible summary of the chosen loan dates. Rendered inline in
// the catalogue's search row — as one chip rather than a row of its own, so the
// dates stay on screen without costing the item grid a line. Clicking it opens
// the range editor in a dialog.
export default function DateSummaryBar() {
  const { state: dates, setStartDate, setEndDate, setDatesSet } = useDates();
  const { clearCart } = useCart();
  const [editOpen, setEditOpen] = useState(false);
  // The dialog edits a draft range rather than the context: a range is picked in
  // two clicks, and writing the first one straight through would leave the
  // catalogue filtered by a half-finished window. The draft is seeded from the
  // context every time the dialog opens, so abandoning a half-made pick simply
  // keeps the old range.
  const [draft, setDraft] = useState<DateRange>([dates.startDate, dates.endDate]);

  const handleOpenChange = (open: boolean) => {
    if (open) setDraft([dates.startDate, dates.endDate]);
    setEditOpen(open);
  };

  const handleEditChange = (next: DateRange) => {
    setDraft(next);
    if (next[0] && next[1]) {
      setStartDate(next[0]);
      setEndDate(next[1]);
    }
  };

  const handleReset = () => {
    clearCart();
    setEditOpen(false);
    setDatesSet(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-9 gap-1.5 px-2.5"
        onClick={() => handleOpenChange(true)}
        aria-label="Muokkaa lainausaikaa"
        title="Muokkaa lainausaikaa"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-semibold">{formatDateShortWeekday(dates.startDate)}</span>
        <span className="text-muted-foreground">&rarr;</span>
        <span className="font-semibold">{formatDateShortWeekday(dates.endDate)}</span>
        <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </Button>

      <Dialog open={editOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Muokkaa lainausaikaa</DialogTitle>
          </DialogHeader>
          <LoanRangeCalendar value={draft} onChange={handleEditChange} minDate={new Date()} />
          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleReset}>
              Nollaa päivät
            </Button>
            <Button onClick={() => setEditOpen(false)}>Valmis</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
