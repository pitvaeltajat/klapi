import {
  formatDateNumeric,
  formatDateOnly,
  formatDateLong,
  formatDateLongShort,
  formatDateTimeKiosk,
} from '@/utils/dateFormat';

type DateTimeFormat = 'numeric' | 'date' | 'long' | 'longShort' | 'kiosk';

const FORMATTERS: Record<DateTimeFormat, (d: Date | string) => string> = {
  numeric: formatDateNumeric,
  date: formatDateOnly,
  long: formatDateLong,
  longShort: formatDateLongShort,
  kiosk: formatDateTimeKiosk,
};

interface DateTimeProps {
  value: Date | string;
  format?: DateTimeFormat;
  className?: string;
}

export function DateTime({ value, format = 'numeric', className }: DateTimeProps) {
  const iso = typeof value === 'string' ? value : value.toISOString();
  return (
    <time dateTime={iso} className={className}>
      {FORMATTERS[format](value)}
    </time>
  );
}
