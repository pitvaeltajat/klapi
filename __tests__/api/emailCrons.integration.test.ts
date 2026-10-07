/**
 * Integration tests for the two email sweeps, `cron/checkExpiringLoans` and
 * `cron/checkOverdueLoans`: who gets which mail, and when.
 *
 * The real route handlers run against the test database; only SES is stubbed,
 * so every send lands in `sent` instead of leaving the machine. The sweeps scan
 * every loan in the database, so assertions only look at mail addressed to this
 * file's own users.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus, EmailType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { helsinkiDayStart } from '@/utils/dateFormat';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `email-cron-test-${Date.now()}`;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const sent: { to: string[]; subject: string; html: string }[] = [];
vi.mock('@/utils/emails/ses-client', () => ({
  sendEmail: async (to: string | string[], subject: string, html: string) => {
    sent.push({ to: Array.isArray(to) ? to : [to], subject, html });
  },
}));

process.env.CRON_SECRET = 'test-cron-secret';
process.env.NEXT_PUBLIC_VERCEL_URL ??= 'klapi.test'; // the mails link back to the app
const { GET: checkExpiring } = await import('@/app/api/cron/checkExpiringLoans/route');
const { GET: checkOverdue } = await import('@/app/api/cron/checkOverdueLoans/route');

const run = async (handler: (request: Request) => Promise<Response>) => {
  const response = await handler(
    new Request('http://localhost/api/cron', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }),
  );
  expect(response.status).toBe(200);
};

const mailTo = (email: string) => sent.filter((m) => m.to.includes(email));

let borrower: { id: string; email: string };
let admin: { id: string; email: string };
let itemIds: string[];

async function createUser(group: Group, extra: Record<string, unknown> = {}) {
  const email = `${prefix}-${group}-${Math.random()}@test.com`;
  const user = await prisma.user.create({
    data: { id: `${prefix}-user-${Math.random()}`, name: group, email, group, ...extra },
  });
  return { id: user.id, email };
}

async function createLoan(opts: {
  startTime: Date;
  endTime: Date;
  status?: LoanStatus;
  reservations: { itemId: string; status: ReservationStatus; amount?: number }[];
  history?: { action: 'RETURNED_TO_BOX' | 'PROCESSED_FROM_BOX'; createdAt: Date }[];
}) {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId: borrower.id,
      status: opts.status ?? LoanStatus.INUSE,
      startTime: opts.startTime,
      endTime: opts.endTime,
      reservations: {
        create: opts.reservations.map((r) => ({ amount: r.amount ?? 1, ...r })),
      },
      history: { create: opts.history ?? [] },
    },
  });
}

beforeAll(async () => {
  borrower = await createUser(Group.USER, { emailExpiringReminder: true });
  admin = await createUser(Group.ADMIN);
  itemIds = await Promise.all(
    ['Trangia', 'Megafoni'].map(async (name) => {
      const item = await prisma.item.create({
        data: { id: `${prefix}-item-${Math.random()}`, name: `${prefix} ${name}`, amount: 10 },
      });
      return item.id;
    }),
  );
});

beforeEach(async () => {
  sent.length = 0;
  await prisma.emailLog.deleteMany({ where: { userId: { in: [borrower.id, admin.id] } } });
  await prisma.loan.deleteMany({ where: { userId: borrower.id } });
});

afterAll(async () => {
  await prisma.emailLog.deleteMany({ where: { userId: { in: [borrower.id, admin.id] } } });
  await prisma.loan.deleteMany({ where: { userId: borrower.id } });
  await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
  await prisma.user.deleteMany({ where: { id: { in: [borrower.id, admin.id] } } });
  await prisma.$disconnect();
});

describe('checkExpiringLoans — pickup reminder', () => {
  it('reminds about a loan starting any time tomorrow, not only 24–25 h out', async () => {
    // Tomorrow evening: the old 24–25 h window missed everything but the hour
    // the cron happened to run in.
    const start = new Date(helsinkiDayStart(new Date(), 1).getTime() + 20 * HOUR);
    await createLoan({
      startTime: start,
      endTime: new Date(start.getTime() + 2 * DAY),
      status: LoanStatus.ACCEPTED,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.ACCEPTED }],
    });

    await run(checkExpiring);

    expect(mailTo(borrower.email).map((m) => m.subject)).toEqual(['Muistutus: nouto huomenna']);
  });

  it('does not remind about a loan starting the day after tomorrow', async () => {
    const start = new Date(helsinkiDayStart(new Date(), 2).getTime() + HOUR);
    await createLoan({
      startTime: start,
      endTime: new Date(start.getTime() + DAY),
      status: LoanStatus.ACCEPTED,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.ACCEPTED }],
    });

    await run(checkExpiring);

    expect(mailTo(borrower.email)).toEqual([]);
  });

  it('sends it once even if the cron runs twice', async () => {
    const start = new Date(helsinkiDayStart(new Date(), 1).getTime() + 10 * HOUR);
    await createLoan({
      startTime: start,
      endTime: new Date(start.getTime() + DAY),
      status: LoanStatus.ACCEPTED,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.ACCEPTED }],
    });

    await run(checkExpiring);
    await run(checkExpiring);

    expect(mailTo(borrower.email)).toHaveLength(1);
  });
});

describe('checkExpiringLoans — loan ends tomorrow', () => {
  it('reminds an opted-in borrower about a loan ending tomorrow evening', async () => {
    const end = new Date(helsinkiDayStart(new Date(), 1).getTime() + 21 * HOUR);
    await createLoan({
      startTime: new Date(Date.now() - 2 * DAY),
      endTime: end,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.INUSE }],
    });

    await run(checkExpiring);

    expect(mailTo(borrower.email).map((m) => m.subject)).toEqual([
      'Muistutus: laina päättyy huomenna',
    ]);
  });
});

describe('checkExpiringLoans — kamat left in the box', () => {
  it('flags a loan whose kamat went into the box over a week ago', async () => {
    const loan = await createLoan({
      startTime: new Date(Date.now() - 12 * DAY),
      endTime: new Date(Date.now() - 9 * DAY),
      status: LoanStatus.IN_BOX,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.IN_BOX }],
      history: [{ action: 'RETURNED_TO_BOX', createdAt: new Date(Date.now() - 8 * DAY) }],
    });

    await run(checkExpiring);

    const mail = mailTo(admin.email);
    expect(mail).toHaveLength(1);
    expect(mail[0].html).toContain(loan.id);
  });

  it('does not flag a long loan that only went into the box yesterday', async () => {
    // Started three weeks ago — the old rule measured from startTime and
    // flagged this the morning after it was returned.
    const loan = await createLoan({
      startTime: new Date(Date.now() - 21 * DAY),
      endTime: new Date(Date.now() - 2 * DAY),
      status: LoanStatus.IN_BOX,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.IN_BOX }],
      history: [{ action: 'RETURNED_TO_BOX', createdAt: new Date(Date.now() - DAY) }],
    });

    await run(checkExpiring);

    expect(mailTo(admin.email).some((m) => m.html.includes(loan.id))).toBe(false);
  });

  it('measures from the latest return after the box was last cleared', async () => {
    // First batch returned and processed long ago; the second batch went in
    // two days ago and is what is sitting there now.
    const loan = await createLoan({
      startTime: new Date(Date.now() - 30 * DAY),
      endTime: new Date(Date.now() - 20 * DAY),
      status: LoanStatus.IN_BOX,
      reservations: [
        { itemId: itemIds[0], status: ReservationStatus.RETURNED },
        { itemId: itemIds[1], status: ReservationStatus.IN_BOX },
      ],
      history: [
        { action: 'RETURNED_TO_BOX', createdAt: new Date(Date.now() - 20 * DAY) },
        { action: 'PROCESSED_FROM_BOX', createdAt: new Date(Date.now() - 19 * DAY) },
        { action: 'RETURNED_TO_BOX', createdAt: new Date(Date.now() - 2 * DAY) },
      ],
    });

    await run(checkExpiring);

    expect(mailTo(admin.email).some((m) => m.html.includes(loan.id))).toBe(false);
  });

  it('sends the digest at most once a week per admin', async () => {
    await createLoan({
      startTime: new Date(Date.now() - 12 * DAY),
      endTime: new Date(Date.now() - 9 * DAY),
      status: LoanStatus.IN_BOX,
      reservations: [{ itemId: itemIds[0], status: ReservationStatus.IN_BOX }],
      history: [{ action: 'RETURNED_TO_BOX', createdAt: new Date(Date.now() - 8 * DAY) }],
    });
    // Last week's digest, six days ago.
    const loan = await prisma.loan.findFirstOrThrow({ where: { userId: borrower.id } });
    await prisma.emailLog.create({
      data: {
        loanId: loan.id,
        userId: admin.id,
        emailType: EmailType.OLD_BOX_ADMIN_NOTIFICATION,
        sentAt: new Date(Date.now() - 6 * DAY),
      },
    });

    await run(checkExpiring);

    expect(mailTo(admin.email)).toEqual([]);
  });
});

describe('checkOverdueLoans', () => {
  it('lists only the kamat still out after a partial return', async () => {
    await createLoan({
      startTime: new Date(Date.now() - 5 * DAY),
      endTime: new Date(Date.now() - DAY - HOUR),
      status: LoanStatus.PARTIALLY_RETURNED,
      reservations: [
        { itemId: itemIds[0], status: ReservationStatus.IN_BOX },
        { itemId: itemIds[1], status: ReservationStatus.INUSE },
      ],
    });

    await run(checkOverdue);

    const mail = mailTo(borrower.email);
    expect(mail).toHaveLength(1);
    expect(mail[0].html).toContain(`${prefix} Megafoni`);
    expect(mail[0].html).not.toContain(`${prefix} Trangia`);
  });

  it('stays quiet once everything is back in the box', async () => {
    await createLoan({
      startTime: new Date(Date.now() - 5 * DAY),
      endTime: new Date(Date.now() - DAY - HOUR),
      status: LoanStatus.IN_BOX,
      reservations: [
        { itemId: itemIds[0], status: ReservationStatus.IN_BOX },
        { itemId: itemIds[1], status: ReservationStatus.RETURNED },
      ],
    });

    await run(checkOverdue);

    expect(mailTo(borrower.email)).toEqual([]);
  });
});
