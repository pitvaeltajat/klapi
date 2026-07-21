/**
 * Helpers for turning a react-datepicker selection into a loan's
 * pickup/return datetimes. Shared by the initial date picker (DateSelector),
 * the compact edit dialog (DateSummaryBar) and the kiosk's return-date picker.
 */

/** Default pickup/return time: 18:00 local. */
export const setDefaultTime = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(18, 0, 0, 0);
  return d;
};

/** End-of-day: 23:59 local (used when start and end land on the same day). */
export const setEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 0, 0);
  return d;
};

export const isSameCalendarDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Apply the loan's default pickup/return times to a picked [start, end] range. */
export const applyRangeTimes = (
  start: Date | null,
  end: Date | null,
): [Date | null, Date | null] => {
  if (!start) return [null, end ? setDefaultTime(end) : null];
  if (!end) return [setDefaultTime(start), null];
  const sameDay = isSameCalendarDay(start, end);
  return [setDefaultTime(start), sameDay ? setEndOfDay(end) : setDefaultTime(end)];
};
