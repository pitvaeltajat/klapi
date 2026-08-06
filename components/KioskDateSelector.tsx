'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '@/utils/datepickerLocale';
import React from 'react';
import { useDates } from '@/contexts/DatesContext';
import { useCart } from '@/contexts/CartContext';
import LoanerAutocomplete from './LoanerAutocomplete';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { formatDateTimeKiosk } from '@/utils/dateFormat';
import { isSameCalendarDay, setDefaultTime, setEndOfDay } from '@/utils/dateRange';

export default function KioskDateSelector() {
  const { state: dates, setEndDate } = useDates();
  const { state: cart, setLoaner, setUserId } = useCart();

  const handleLoanerChange = (value: string, userId?: string) => {
    setLoaner(value);
    setUserId(userId);
  };

  // Same rule as the regular date picker: 18:00 on the return day, except for a
  // same-day loan, which runs to end of day.
  const handleDateChange = (date: Date | null) => {
    if (!date) return;
    setEndDate(isSameCalendarDay(date, new Date()) ? setEndOfDay(date) : setDefaultTime(date));
  };

  return (
    <>
      <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <Label size="section">Lainaaja</Label>
          <LoanerAutocomplete
            value={cart.loaner || ''}
            onChange={handleLoanerChange}
            placeholder="Syötä nimi tai valitse sähköposti"
            size="lg"
            showValidationFeedback
          />
        </Card>

        <Card className="h-full">
          <Label size="section">Palautuspäivä</Label>
          <div className="flex justify-center overflow-x-auto">
            <DatePicker
              selected={dates.endDate}
              onChange={handleDateChange}
              inline
              monthsShown={2}
              minDate={new Date()}
              dateFormat="dd.MM.yyyy"
            />
          </div>
        </Card>
      </div>

      <Alert variant="info" icon={false} className="mb-4 flex-wrap items-center justify-center gap-3">
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground">Laina alkaa</span>
          <span className="text-lg font-bold">{formatDateTimeKiosk(dates.startDate)}</span>
        </div>
        <span className="px-2 text-xl text-muted-foreground">&rarr;</span>
        <div className="flex flex-col items-center">
          <span className="text-xs font-medium text-muted-foreground">Palautus viimeistään</span>
          <span className="text-lg font-bold">{formatDateTimeKiosk(dates.endDate)}</span>
        </div>
      </Alert>
    </>
  );
}
