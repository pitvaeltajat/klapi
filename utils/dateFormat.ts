/**
 * Centralized Finnish date formatting utilities.
 * All formatters use the fi-FI locale and Europe/Helsinki timezone.
 */

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
