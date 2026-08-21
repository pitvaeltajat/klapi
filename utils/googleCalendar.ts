import { getGoogleAccessToken } from '@/utils/googleAuth';

/**
 * Minimal write client for one shared Google Calendar — the troop's
 * "Klapi-lainat" calendar, whose id is `GOOGLE_CALENDAR_ID`.
 *
 * The service account acts **as itself** here, not as a person: the calendar is
 * shared with the SA's own email address ("Tee muutoksia tapahtumiin") exactly
 * the way you'd share it with a colleague. That is the whole authorisation
 * story — no domain-wide delegation, no Admin console, and the SA can reach
 * nothing else in anybody's calendar. Setup is in `README.md`
 * (§ Loans on the shared calendar).
 *
 * Everything above this file lives in `utils/loanCalendar`, which decides
 * *whether* a loan gets an event and what it says. This one only speaks HTTP.
 */

const CALENDAR_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

/** One event as Klapi writes it. A partial of the Calendar API's resource. */
export type CalendarEventInput = {
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: { email: string }[];
  /** 'transparent' = "free": a loan should not make the borrower look busy. */
  transparency?: 'opaque' | 'transparent';
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  source?: { title: string; url: string };
};

/** The event we meant to touch is not on the calendar any more. */
export class CalendarEventGone extends Error {
  constructor(eventId: string) {
    super(`Calendar event ${eventId} no longer exists`);
    this.name = 'CalendarEventGone';
  }
}

/** What `utils/loanCalendar` needs from a calendar — faked in tests. */
export interface CalendarClient {
  /** Creates the event and answers with its id. */
  createEvent(event: CalendarEventInput): Promise<string>;
  /** Updates an existing event. Throws `CalendarEventGone` if it isn't there. */
  patchEvent(eventId: string, event: CalendarEventInput): Promise<void>;
  /** Removes an event. Already-gone counts as success. */
  deleteEvent(eventId: string): Promise<void>;
}

/**
 * Whether the calendar mirror is wired up at all. Local dev, tests and any
 * deploy without the env vars simply skip it — a missing calendar must never
 * be the reason a loan fails to save.
 */
export function isCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_WORKSPACE_SA_KEY);
}

async function calendarFetch(
  path: string,
  init: { method: string; body?: CalendarEventInput },
): Promise<Response> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID!;
  const token = await getGoogleAccessToken(SCOPES);

  const url = new URL(`${CALENDAR_URL}/${encodeURIComponent(calendarId)}/events${path}`);
  // Klapi mails about loans itself; Google must not send a second round of
  // "you have been invited" on top of it.
  url.searchParams.set('sendUpdates', 'none');

  return fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
}

export const googleCalendar: CalendarClient = {
  async createEvent(event) {
    const response = await calendarFetch('', { method: 'POST', body: event });
    if (!response.ok) {
      throw new Error(`Calendar insert failed (${response.status}): ${await response.text()}`);
    }
    const created = (await response.json()) as { id?: string };
    if (!created.id) throw new Error('Calendar insert returned no event id');
    return created.id;
  },

  async patchEvent(eventId, event) {
    const response = await calendarFetch(`/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      body: event,
    });
    // 410 is a cancelled event, 404 a purged one — either way somebody deleted
    // it by hand and the caller should make a fresh one.
    if (response.status === 404 || response.status === 410) throw new CalendarEventGone(eventId);
    if (!response.ok) {
      throw new Error(`Calendar patch failed (${response.status}): ${await response.text()}`);
    }
  },

  async deleteEvent(eventId) {
    const response = await calendarFetch(`/${encodeURIComponent(eventId)}`, { method: 'DELETE' });
    if (response.ok || response.status === 404 || response.status === 410) return;
    throw new Error(`Calendar delete failed (${response.status}): ${await response.text()}`);
  },
};
