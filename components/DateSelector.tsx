'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import React, { useState } from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatDateLong } from '@/utils/dateFormat';

export default function DateSelector() {
  const { state: dates, setStartDate, setEndDate, setDatesSet, setBrowseMode } = useDates();
  const { clearCart } = useCart();

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0);
    return newDate;
  };

  const handleRangeChange = (update: [Date | null, Date | null]) => {
    const next: [Date | null, Date | null] = [
      update[0] ? setDefaultTime(update[0]) : null,
      update[1] ? setDefaultTime(update[1]) : null,
    ];
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
      {!dates.datesSet ? (
        <>
          <div>
            <h2 className="mb-2 text-2xl font-semibold">Aloitus</h2>
            <p className="text-muted-foreground">
              Aloita valitsemalla kamojen nouto- ja palautusajankohdat.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <Label className="font-bold">Valitse lainausaika</Label>
            <div className="mt-2">
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
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => setBrowseMode(true)}
            >
              Selaa katalogia ilman varausta
            </Button>
          </div>
        </>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Valitut päivämäärät</h2>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-xs">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold">Nouto:</span>
                <span>
                  {formatDateLong(dates.startDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Palautus:</span>
                <span>
                  {formatDateLong(dates.endDate)}
                </span>
              </div>

              <div className="pt-2">
                <Label className="font-bold">Muokkaa aikaa</Label>
                <div className="mt-2">
                  <DatePicker
                    selected={dates.startDate}
                    onChange={(update: [Date | null, Date | null]) => {
                      if (update[0]) {
                        update[0] = setDefaultTime(update[0]);
                        setStartDate(update[0]);
                        // If no end date yet and the new start is after the current end, reset end to start
                        if (!update[1] && update[0] > dates.endDate) {
                          setEndDate(update[0]);
                        }
                      }
                      if (update[1]) {
                        update[1] = setDefaultTime(update[1]);
                        setEndDate(update[1]);
                      }
                    }}
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
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={() => {
                    clearCart();
                    setDatesSet(false);
                    setDateRange([null, null]);
                  }}
                >
                  Nollaa päivät
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
