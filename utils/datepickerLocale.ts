import { registerLocale, setDefaultLocale } from 'react-datepicker';
import { fi } from 'date-fns/locale/fi';

// react-datepicker ships no locale data of its own — it formats through
// date-fns and defaults to en-US. Import this module (a side effect, like the
// stylesheet) anywhere a DatePicker is rendered so month names, weekday
// initials and aria-labels come out Finnish. The fi locale also starts the week
// on Monday, so `calendarStartDay` is no longer needed at the call sites.
registerLocale('fi', fi);
setDefaultLocale('fi');
