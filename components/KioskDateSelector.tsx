'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import React from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import LoanerAutocomplete from './LoanerAutocomplete';
import { Label } from '@/components/ui/label';
import { formatDateTimeKiosk } from '@/utils/dateFormat';

export default function KioskDateSelector() {
  const { state: dates, setEndDate } = useDates();
  const { state: cart, setLoaner, setUserId } = useCart();

  const setDefaultTime = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setHours(18, 0, 0, 0);
    return newDate;
  };

  const handleLoanerChange = (value: string, userId?: string) => {
    setLoaner(value);
    setUserId(userId);
  };

  const handleDateChange = (date: Date | null) => {
    if (date) {
      const today = new Date();
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      if (isToday) {
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 0, 0);
        setEndDate(endOfDay);
      } else {
        setEndDate(setDefaultTime(date));
      }
    }
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <div className="h-full rounded-lg border bg-card p-6 shadow-xs">
          <Label className="mb-4 block text-lg font-bold">Lainaaja</Label>
          <LoanerAutocomplete
            value={cart.loaner || ''}
            onChange={handleLoanerChange}
            placeholder="Syötä nimi tai valitse sähköposti"
            size="lg"
            showValidationFeedback
          />
        </div>

        <div className="h-full rounded-lg border bg-card p-6 shadow-xs">
          <Label className="mb-2 block text-lg font-bold">Palautuspäivä</Label>
          <div className="flex justify-center overflow-x-auto">
            <DatePicker
              selected={dates.endDate}
              onChange={handleDateChange}
              inline
              monthsShown={2}
              minDate={new Date()}
              dateFormat="dd.MM.yyyy"
              calendarStartDay={1}
            />
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground">Laina alkaa</span>
          <span className="text-lg font-bold">{formatDateTimeKiosk(dates.startDate)}</span>
        </div>
        <span className="px-2 text-xl text-muted-foreground">&rarr;</span>
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground">Palautus viimeistään</span>
          <span className="text-lg font-bold">{formatDateTimeKiosk(dates.endDate)}</span>
        </div>
      </div>
    </>
  );
}
