/**
 * Integration tests for the loan → Google Calendar mirror
 * (utils/loanCalendar).
 *
 * The calendar itself is a fake `CalendarClient`, so these exercise the
 * reconciliation — create vs. patch vs. delete, who gets invited, what the
 * event says — without a service-account key or a network call. What Google
 * does with the request is `utils/googleCalendar`'s problem.
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import {
  CalendarEventGone,
  type CalendarClient,
  type CalendarEventInput,
} from '@/utils/googleCalendar';
import { buildLoanEvent, syncLoanCalendar } from '@/utils/loanCalendar';

// Both are read at call time by the code under test: the domain decides who may
// be invited, and the public URL goes in the event description.
process.env.GOOGLE_WORKSPACE_DOMAIN = 'pitva.test';
process.env.NEXT_PUBLIC_VERCEL_URL = 'https://klapi.test';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const testPrefix = `cal-${Date.now()}`;

/** Event ids are unique across every fake in the file, not just within one. */
let nextEventId = 0;

/** Records every call, and lets a test make one of them misbehave. */
function fakeCalendar(overrides: Partial<CalendarClient> = {}) {
  const created: CalendarEventInput[] = [];
  const patched: { eventId: string; event: CalendarEventInput }[] = [];
  const deleted: string[] = [];

  const client: CalendarClient = {
    createEvent: vi.fn(async (event) => {
      created.push(event);
      return `${testPrefix}-event-${++nextEventId}`;
    }),
    patchEvent: vi.fn(async (eventId, event) => {
      patched.push({ eventId, event });
    }),
    deleteEvent: vi.fn(async (eventId) => {
      deleted.push(eventId);
    }),
    ...overrides,
  };

  return { client, created, patched, deleted };
}

async function createUser(
  overrides: Partial<{ email: string; name: string; group: Group; calendarLoanEvents: boolean }> = {},
) {
  return prisma.user.create({
    data: {
      id: `${testPrefix}-user-${Math.random()}`,
      name: overrides.name ?? 'Testi Lainaaja',
      email: overrides.email ?? `${testPrefix}-${Math.random()}@pitva.test`,
      group: overrides.group ?? Group.USER,
      calendarLoanEvents: overrides.calendarLoanEvents ?? true,
    },
  });
}

async function createLoan(
  userId: string,
  overrides: Partial<{ status: LoanStatus; description: string | null; loaner: string | null }> = {},
) {
  const item = await prisma.item.create({
    data: { id: `${testPrefix}-item-${Math.random()}`, name: 'Teltta', amount: 5 },
  });

  return prisma.loan.create({
    data: {
      id: `${testPrefix}-loan-${Math.random()}`,
      userId,
      status: overrides.status ?? LoanStatus.ACCEPTED,
      description: overrides.description ?? 'Vartioretki',
      loaner: overrides.loaner ?? null,
      startTime: new Date('2026-09-04T15:00:00.000Z'),
      endTime: new Date('2026-09-06T15:00:00.000Z'),
      reservations: { create: [{ itemId: item.id, amount: 2 }] },
    },
  });
}

async function cleanUp() {
  await prisma.reservation.deleteMany({ where: { loanId: { startsWith: testPrefix } } });
  await prisma.loan.deleteMany({ where: { id: { startsWith: testPrefix } } });
  await prisma.item.deleteMany({ where: { id: { startsWith: testPrefix } } });
  await prisma.user.deleteMany({ where: { id: { startsWith: testPrefix } } });
}

beforeAll(cleanUp);
beforeEach(cleanUp);
afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe('syncLoanCalendar', () => {
  it('creates an event for a new loan and remembers its id', async () => {
    const user = await createUser({ email: `${testPrefix}-eero@pitva.test`, name: 'Eero' });
    const loan = await createLoan(user.id);
    const { client, created } = fakeCalendar();

    expect(await syncLoanCalendar(loan.id, client)).toBe('created');

    expect(created).toHaveLength(1);
    expect(created[0].summary).toBe('Eero: Vartioretki');
    expect(created[0].attendees).toEqual([{ email: `${testPrefix}-eero@pitva.test` }]);
    expect(created[0].description).toContain('2 × Teltta');
    expect(created[0].description).toContain(`https://klapi.test/loan/${loan.id}`);

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.calendarEventId).toBeTruthy();
  });

  it('patches the existing event instead of making a second one', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id);
    const { client, created, patched } = fakeCalendar();

    await syncLoanCalendar(loan.id, client);
    const eventId = (await prisma.loan.findUnique({ where: { id: loan.id } }))?.calendarEventId;

    await prisma.loan.update({
      where: { id: loan.id },
      data: { endTime: new Date('2026-09-08T15:00:00.000Z') },
    });
    expect(await syncLoanCalendar(loan.id, client)).toBe('updated');

    expect(created).toHaveLength(1);
    expect(patched).toHaveLength(1);
    expect(patched[0].eventId).toBe(eventId);
    expect(patched[0].event.end.dateTime).toBe('2026-09-08T15:00:00.000Z');
  });

  it('re-creates the event when somebody deleted it by hand', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id);

    const { client, created } = fakeCalendar();
    await syncLoanCalendar(loan.id, client);
    const firstId = (await prisma.loan.findUnique({ where: { id: loan.id } }))?.calendarEventId;

    const gone = fakeCalendar({
      patchEvent: vi.fn(async (eventId) => {
        throw new CalendarEventGone(eventId);
      }),
    });
    expect(await syncLoanCalendar(loan.id, gone.client)).toBe('created');

    const secondId = (await prisma.loan.findUnique({ where: { id: loan.id } }))?.calendarEventId;
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(firstId);
    expect(created).toHaveLength(1);
    expect(gone.created).toHaveLength(1);
  });

  it('removes the event when the loan is cancelled', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id);
    const { client, deleted } = fakeCalendar();

    await syncLoanCalendar(loan.id, client);
    const eventId = (await prisma.loan.findUnique({ where: { id: loan.id } }))?.calendarEventId;

    await prisma.loan.update({ where: { id: loan.id }, data: { status: LoanStatus.CANCELLED } });
    expect(await syncLoanCalendar(loan.id, client)).toBe('deleted');

    expect(deleted).toEqual([eventId]);
    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.calendarEventId).toBeNull();
  });

  it('does nothing for a cancelled loan that never had an event', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id, { status: LoanStatus.REJECTED });
    const { client, created, deleted } = fakeCalendar();

    expect(await syncLoanCalendar(loan.id, client)).toBe('skipped');
    expect(created).toHaveLength(0);
    expect(deleted).toHaveLength(0);
  });

  it('skips a loan that has been deleted under it', async () => {
    const { client } = fakeCalendar();
    expect(await syncLoanCalendar(`${testPrefix}-nonexistent`, client)).toBe('skipped');
  });

  it('is a no-op when no calendar is configured', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id);

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    delete process.env.GOOGLE_CALENDAR_ID;
    try {
      expect(await syncLoanCalendar(loan.id)).toBe('skipped');
    } finally {
      if (calendarId !== undefined) process.env.GOOGLE_CALENDAR_ID = calendarId;
    }

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.calendarEventId).toBeNull();
  });

  // The calendar client impersonates the calendar's owner, because a service
  // account acting as itself cannot invite attendees. A half-set environment
  // must therefore skip rather than mint a token that Google will refuse.
  it('is a no-op when the impersonation subject is missing', async () => {
    const user = await createUser();
    const loan = await createLoan(user.id);

    const saved = {
      GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
      GOOGLE_WORKSPACE_SA_KEY: process.env.GOOGLE_WORKSPACE_SA_KEY,
      GOOGLE_WORKSPACE_SUBJECT: process.env.GOOGLE_WORKSPACE_SUBJECT,
    };
    process.env.GOOGLE_CALENDAR_ID = 'calendar@example.com';
    process.env.GOOGLE_WORKSPACE_SA_KEY = 'irrelevant';
    delete process.env.GOOGLE_WORKSPACE_SUBJECT;
    try {
      expect(await syncLoanCalendar(loan.id)).toBe('skipped');
    } finally {
      for (const [name, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.calendarEventId).toBeNull();
  });
});

describe('buildLoanEvent', () => {
  const base = {
    id: 'loan-1',
    status: LoanStatus.ACCEPTED,
    startTime: new Date('2026-09-04T15:00:00.000Z'),
    endTime: new Date('2026-09-06T15:00:00.000Z'),
    description: null,
    loaner: null,
    user: {
      name: 'Eero',
      email: 'eero@pitva.test',
      group: 'USER',
      deletedAt: null,
      calendarLoanEvents: true,
    },
    reservations: [{ amount: 1, item: { name: 'Teltta' } }],
  };

  it('falls back to the item count when the loan has no description', () => {
    expect(buildLoanEvent(base).summary).toBe('Eero: 1 kama');
    expect(
      buildLoanEvent({
        ...base,
        reservations: [
          { amount: 1, item: { name: 'Teltta' } },
          { amount: 2, item: { name: 'Makuupussi' } },
        ],
      }).summary,
    ).toBe('Eero: 2 kamaa');
  });

  it('prefers the kiosk’s "Lainaaja" name over the account it landed in', () => {
    expect(buildLoanEvent({ ...base, loaner: 'Sudenpennut' }).summary).toBe('Sudenpennut: 1 kama');
  });

  // The self-service cart used to stamp `loaner` with the signed-in address, so
  // plenty of stored loans carry one. Titling the troop's calendar after a
  // mailbox helps nobody when the account's own name is right there.
  it('titles after the account name when loaner is merely its own address', () => {
    expect(buildLoanEvent({ ...base, loaner: 'eero@pitva.test' }).summary).toBe('Eero: 1 kama');
    expect(buildLoanEvent({ ...base, loaner: 'Eero@Pitva.Test' }).summary).toBe('Eero: 1 kama');
  });

  it('keeps a loaner that names somebody other than the account', () => {
    // Deliberately named by whoever made the loan — not ours to second-guess,
    // whether it is a patrol, a person, or another address.
    expect(buildLoanEvent({ ...base, loaner: 'aino@pitva.test' }).summary).toBe(
      'aino@pitva.test: 1 kama',
    );
  });

  it('still has something to say when the account has no name', () => {
    const nameless = { ...base, user: { ...base.user, name: null } };
    expect(buildLoanEvent({ ...nameless, loaner: 'eero@pitva.test' }).summary).toBe(
      'eero@pitva.test: 1 kama',
    );
    expect(buildLoanEvent({ ...nameless, loaner: null }).summary).toBe('eero@pitva.test: 1 kama');
  });

  it('leaves the loan free rather than busy in the borrower’s calendar', () => {
    expect(buildLoanEvent(base).transparency).toBe('transparent');
  });

  it('invites nobody when the borrower has opted out', () => {
    expect(
      buildLoanEvent({ ...base, user: { ...base.user, calendarLoanEvents: false } }).attendees,
    ).toBeUndefined();
  });

  it('invites nobody outside the Workspace domain', () => {
    expect(
      buildLoanEvent({ ...base, user: { ...base.user, email: 'eero@gmail.com' } }).attendees,
    ).toBeUndefined();
  });

  it('never invites the shared kiosk terminal', () => {
    expect(
      buildLoanEvent({ ...base, user: { ...base.user, group: 'KIOSK' } }).attendees,
    ).toBeUndefined();
  });

  it('never invites a member who has left', () => {
    expect(
      buildLoanEvent({ ...base, user: { ...base.user, deletedAt: new Date() } }).attendees,
    ).toBeUndefined();
  });
});
