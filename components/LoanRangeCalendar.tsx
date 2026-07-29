'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { formatDateShortWeekday, formatTimeOnly } from '@/utils/dateFormat';
import { applyRangeTimes, previewRange, type DateRange } from '@/utils/dateRange';

// The loan-window calendar, with a live summary of the two endpoints above it.
// Picking a range is two clicks and the calendar alone never says which one you
// are on, so the summary previews the click under the cursor: the endpoint that
// would change is outlined and shown greyed out, and goes solid once clicked.
// Used by both the initial picker (DateSelector) and the edit dialog
// (DateSummaryBar) so the two can't drift apart.

type EndpointProps = {
  label: string;
  date: Date | null;
  /** The value is a preview of the hovered click, not a committed choice. */
  pending: boolean;
};

function Endpoint({ label, date, pending }: EndpointProps) {
  return (
    <Card
      variant="inset"
      padding="sm"
      className={cn(
        'min-w-0 flex-1 transition-colors',
        pending && 'border-dashed border-primary/60 bg-primary/5',
      )}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className={cn(
          'truncate text-base font-semibold',
          pending ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {date ? formatDateShortWeekday(date) : '—'}
      </div>
      <div className="text-xs text-muted-foreground">
        {date ? `klo ${formatTimeOnly(date)}` : 'Valitse päivä'}
      </div>
    </Card>
  );
}

type LoanRangeCalendarProps = {
  /** The picked range; `end` is null between the two clicks. */
  value: DateRange;
  /** Called with the range after the loan's default times are applied. */
  onChange: (range: DateRange) => void;
  minDate?: Date;
  monthsShown?: number;
  className?: string;
};

export default function LoanRangeCalendar({
  value,
  onChange,
  minDate,
  monthsShown,
  className,
}: LoanRangeCalendarProps) {
  const [hovered, setHovered] = useState<Date | null>(null);
  const [start, end] = value;
  const preview = previewRange(value, hovered);

  const hint = !start
    ? 'Valitse noutopäivä kalenterista'
    : !end
      ? 'Valitse palautuspäivä'
      : 'Napsauta päivää aloittaaksesi valinnan alusta';

  const handleChange = (update: DateRange) => {
    // Drop the preview on click: the cursor stays on the same day, so no
    // mouse-enter follows and the summary would otherwise keep the just-picked
    // endpoint greyed out.
    setHovered(null);
    onChange(applyRangeTimes(update[0], update[1]));
  };

  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className="w-full">
        <div className="flex items-stretch gap-2">
          <Endpoint label="Nouto" date={preview.start} pending={preview.pendingStart} />
          <span aria-hidden className="self-center text-muted-foreground">
            &rarr;
          </span>
          <Endpoint label="Palautus" date={preview.end} pending={preview.pendingEnd} />
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">{hint}</p>
      </div>

      {/* w-full so the calendar can span the panel on phones (globals.css lets
          its day cells share that width and reach a real touch target); the
          parent's items-center would otherwise shrink this to fit-content. */}
      <div
        className="flex w-full justify-center overflow-x-auto"
        onMouseLeave={() => setHovered(null)}
      >
        <DatePicker
          selected={start}
          onChange={handleChange}
          startDate={start ?? undefined}
          endDate={end ?? undefined}
          onDayMouseEnter={setHovered}
          selectsRange
          swapRange
          inline
          minDate={minDate}
          monthsShown={monthsShown}
          dateFormat="dd.MM.yyyy"
          calendarStartDay={1}
        />
      </div>
    </div>
  );
}
