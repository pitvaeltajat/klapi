/**
 * Centralized Finnish date formatting utilities.
 * All formatters use the fi-FI locale and Europe/Helsinki timezone.
 */

/**
 * The instant a Helsinki calendar day begins, `dayOffset` days from the one
 * `now` falls on (0 = today, 1 = tomorrow). The cron sweeps use it so "huomenna"
 * in an email means tomorrow on the troop's clock, not "24 h from the cron run".
 */
export function helsinkiDayStart(now: Date, dayOffset: number): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Helsinki' })
    .format(now)
    .split('-')
    .map(Number);
  const utcMidnight = new Date(Date.UTC(y, m - 1, d + dayOffset));
  // Helsinki's UTC offset at that moment (+2 or +3); Finland changes clocks at
  // 03:00/04:00, never at midnight, so the offset at UTC midnight is the right one.
  const wall = (timeZone: string) =>
    new Date(utcMidnight.toLocaleString('en-US', { timeZone })).getTime();
  return new Date(utcMidnight.getTime() - (wall('Europe/Helsinki') - wall('UTC')));
}

/** "1.1.2025 09:30" — numeric date + time */
export function formatDateNumeric(date: Date | string): string {
  return new Date(date).toLocaleString('fi-FI', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

/** "1.1.2025" — numeric date only */
export function formatDateOnly(date: Date | string): string {
  return new Date(date).toLocaleDateString('fi-FI', {
    timeZone: 'Europe/Helsinki',
  });
}

/** "maanantai 1. tammikuuta 2025 klo 9.30" — long form with weekday */
export function formatDateLong(date: Date | string): string {
  return new Date(date).toLocaleDateString('fi-FI', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

/** "1. tammikuuta 2025" — long form without time */
export function formatDateLongShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('fi-FI', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Europe/Helsinki',
  });
}

/** "1.1.2025 klo 09.30" — the compact everyday form: numeric date + "klo" + time */
export function formatDateKlo(date: Date | string): string {
  return `${formatDateOnly(date)} klo ${formatTimeOnly(date)}`;
}

/** "ma 23.5." — short weekday + day.month, for compact date summaries */
export function formatDateShortWeekday(date: Date | string): string {
  return new Date(date).toLocaleDateString('fi-FI', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    timeZone: 'Europe/Helsinki',
  });
}

/** "09:30" — time only */
export function formatTimeOnly(date: Date | string): string {
  return new Date(date).toLocaleTimeString('fi-FI', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Helsinki',
  });
}

/** "ma 1.1.2025 klo 09:30" — short weekday + date + "klo" + time (kiosk) */
export function formatDateTimeKiosk(date: Date | string): string {
  const d = new Date(date);
  return (
    d.toLocaleDateString('fi-FI', {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      timeZone: 'Europe/Helsinki',
    }) +
    ' klo ' +
    d.toLocaleTimeString('fi-FI', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Helsinki',
    })
  );
}
