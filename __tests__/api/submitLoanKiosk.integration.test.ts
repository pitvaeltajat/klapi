/**
 * Integration tests for `POST /api/loan/submitLoan` made **at the kaluston
 * kone** — including by an admin who has PIN-elevated on it, which flips the
 * session's group to ADMIN while leaving it the same shared terminal.
 *
 * The real route handler runs with `auth()` stubbed to whatever session the
 * test is standing in for. `after()` is stubbed too: the route sends its emails
 * from there, and there is no request scope in a test.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `kiosk-submit-test-${Date.now()}`;

let kioskId: string;
let adminId: string;
let memberId: string;
let itemId: string;

type TestSession = {
  user: { id: string; group: Group; elevatedById?: string | null };
};

let currentSession: TestSession;

vi.mock('@/lib/auth', () => ({ auth: async () => currentSession }));

// The loan is committed before these run and neither is under test here.
vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: () => {},
}));

const { POST } = await import('@/app/api/loan/submitLoan/route');

const submit = (body: Record<string, unknown>) =>
  POST(
    new Request('http://localhost/api/loan/submitLoan', {
      method: 'POST',
      body: JSON.stringify({
        reservations: [{ itemId, amount: 1 }],
        startTime: new Date(),
        endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        description: 'Retki',
        ...body,
      }),
    }),
  );

async function loanFrom(response: Response) {
  expect(response.status).toBe(200);
  const { id } = (await response.json()) as { id: string };
  return prisma.loan.findUniqueOrThrow({
    where: { id },
    include: { reservations: true, history: true },
  });
}

/** An admin standing at the kiosk: group ADMIN, but still the kiosk account. */
const elevated = (): TestSession => ({
  user: { id: kioskId, group: Group.ADMIN, elevatedById: adminId },
});

describe('submitLoan from the kaluston kone', () => {
  beforeAll(async () => {
    const kiosk = await prisma.user.create({
      data: {
        id: `${prefix}-kiosk`,
        name: 'Kaluston kone',
        email: `${prefix}-kiosk@test.com`,
        group: Group.KIOSK,
      },
    });
    kioskId = kiosk.id;
    const admin = await prisma.user.create({
      data: {
        id: `${prefix}-admin`,
        name: 'Ville Ylläpitäjä',
        email: `${prefix}-admin@test.com`,
        group: Group.ADMIN,
      },
    });
    adminId = admin.id;
    const member = await prisma.user.create({
      data: {
        id: `${prefix}-member`,
        name: 'Matti Meikäläinen',
        email: `${prefix}-member@test.com`,
        group: Group.USER,
        emailNewLoanNotification: false,
      },
    });
    memberId = member.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Teltta', amount: 10 },
    });
    itemId = item.id;
  });

  beforeEach(async () => {
    currentSession = { user: { id: kioskId, group: Group.KIOSK } };
    const userIds = [kioskId, adminId, memberId];
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: { in: userIds } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: { in: userIds } } } });
    await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
  });

  afterAll(async () => {
    const userIds = [kioskId, adminId, memberId];
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: { in: userIds } } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: { in: userIds } } } });
    await prisma.loan.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  it('starts a kiosk loan in use, as before', async () => {
    const loan = await loanFrom(await submit({ userId: kioskId, loaner: 'Kaisa Karhu' }));
    expect(loan.status).toBe(LoanStatus.INUSE);
    expect(loan.reservations[0].status).toBe(ReservationStatus.INUSE);
  });

  it('starts an elevated admin’s loan in use too — same store room, same gear', async () => {
    currentSession = elevated();

    const loan = await loanFrom(await submit({ userId: memberId, loaner: 'Matti Meikäläinen' }));
    expect(loan.status).toBe(LoanStatus.INUSE);
    expect(loan.reservations[0].status).toBe(ReservationStatus.INUSE);
    expect(loan.userId).toBe(memberId);
  });

  it('lets an elevated admin lend to a name with no account at all', async () => {
    currentSession = elevated();

    // No `userId` from the cart: the free-text loaner falls back to the kiosk's
    // own account, exactly as it does for a plain kiosk loan.
    const loan = await loanFrom(await submit({ userId: kioskId, loaner: 'Vieraileva vanhempi' }));
    expect(loan.userId).toBe(kioskId);
    expect(loan.loaner).toBe('Vieraileva vanhempi');
    expect(loan.status).toBe(LoanStatus.INUSE);
  });

  it('credits the elevated admin in the history, not the kiosk', async () => {
    currentSession = elevated();

    const loan = await loanFrom(await submit({ userId: memberId, loaner: 'Matti Meikäläinen' }));
    const created = loan.history.find((h) => h.action === 'CREATED');
    expect(created?.actedById).toBe(adminId);
    expect(created?.details).toMatchObject({ viaKiosk: true });
  });

  it('leaves a booking for a later date as a reservation', async () => {
    currentSession = elevated();

    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const loan = await loanFrom(
      await submit({
        userId: memberId,
        loaner: 'Matti Meikäläinen',
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      }),
    );
    expect(loan.status).toBe(LoanStatus.ACCEPTED);
    expect(loan.reservations[0].status).toBe(ReservationStatus.ACCEPTED);
  });

  it('leaves an admin on their own machine making an ordinary reservation', async () => {
    currentSession = { user: { id: adminId, group: Group.ADMIN } };

    const loan = await loanFrom(await submit({ userId: memberId, loaner: 'Matti Meikäläinen' }));
    expect(loan.status).toBe(LoanStatus.ACCEPTED);
    expect(loan.reservations[0].status).toBe(ReservationStatus.ACCEPTED);
  });
});
