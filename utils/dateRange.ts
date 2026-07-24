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

/**
 * The loan window the kiosk starts people off with: pick up now, return at
 * 18:00 a week out. Used both by the kiosk's welcome screen and when leaving
 * browse mode on the kiosk, which must agree on the default.
 */
export const defaultKioskRange = (): [Date, Date] => {
  const end = new Date();
  end.setDate(end.getDate() + 7);
  return [new Date(), setDefaultTime(end)];
};

/** A loan window being picked: the end is null between the two clicks. */
export type DateRange = [Date | null, Date | null];

/** Apply the loan's default pickup/return times to a picked [start, end] range. */
export const applyRangeTimes = (start: Date | null, end: Date | null): DateRange => {
  if (!start) return [null, end ? setDefaultTime(end) : null];
  if (!end) return [setDefaultTime(start), null];
  const sameDay = isSameCalendarDay(start, end);
  return [setDefaultTime(start), sameDay ? setEndOfDay(end) : setDefaultTime(end)];
};

const isBeforeDay = (a: Date, b: Date): boolean =>
  new Date(a).setHours(0, 0, 0, 0) < new Date(b).setHours(0, 0, 0, 0);

/**
 * The range react-datepicker would hand back if `day` were clicked next.
 *
 * Mirrors the library's `selectsRange` + `swapRange` rules (see `setSelected`
 * in react-datepicker): an empty *or already complete* range restarts from the
 * clicked day, a half-open range closes on it, and a click before the start
 * swaps the two ends instead of throwing the start away. Kept here — rather
 * than read off the calendar — so the summary above the calendar can show the
 * result of a click before it happens.
 */
export const nextRangeAfterClick = ([start, end]: DateRange, day: Date): DateRange => {
  if (start && !end) return isBeforeDay(day, start) ? [day, start] : [start, day];
  if (!start && end) return isBeforeDay(day, end) ? [day, end] : [day, null];
  return [day, null];
};

/**
 * What the range summary should display while `hovered` is under the cursor,
 * and which of the two ends that click would rewrite. `pendingStart` /
 * `pendingEnd` mark the ends that aren't settled — the one the hovered click
 * would change, or, with nothing hovered, the one still waiting to be picked —
 * so the UI can grey them out until they're actually clicked.
 */
export const previewRange = (
  range: DateRange,
  hovered: Date | null,
): { start: Date | null; end: Date | null; pendingStart: boolean; pendingEnd: boolean } => {
  const [start, end] = range;
  if (!hovered) {
    return { start, end, pendingStart: !start, pendingEnd: Boolean(start) && !end };
  }

  const [nextStart, nextEnd] = applyRangeTimes(...nextRangeAfterClick(range, hovered));
  const changed = (a: Date | null, b: Date | null) =>
    a === null || b === null ? a !== b : !isSameCalendarDay(a, b);

  return {
    start: nextStart,
    end: nextEnd,
    pendingStart: changed(nextStart, start),
    pendingEnd: changed(nextEnd, end),
  };
};
