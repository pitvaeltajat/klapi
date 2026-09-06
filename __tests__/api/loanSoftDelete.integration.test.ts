/**
 * Integration tests for soft-deleting a loan: `POST /api/loan/deleteLoan` and
 * `POST /api/loan/restoreLoan`, plus the thing the feature actually rests on —
 * that a deleted loan stops holding kamat.
 *
 * The real route handlers run with the admin guard stubbed out; the calendar
 * sync is stubbed because it would call `after()` outside a request scope.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient, Group, LoanStatus, ReservationStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const prefix = `loandelete-test-${Date.now()}`;

let adminId: string;
let itemId: string;

const guard: { admin: boolean } = { admin: true };

vi.mock('@/utils/apiAuth', () => ({
  requireAdmin: async () =>
    guard.admin
      ? { session: { user: { id: adminId, group: Group.ADMIN } }, denied: null }
      : { session: null, denied: new Response(null, { status: 401 }) },
  requireUser: async () => ({
    session: { user: { id: adminId, group: Group.ADMIN } },
    denied: null,
  }),
}));

vi.mock('@/utils/loanCalendar', () => ({ syncLoanCalendarInBackground: () => {} }));

const { POST: deleteLoan } = await import('@/app/api/loan/deleteLoan/route');
const { POST: restoreLoan } = await import('@/app/api/loan/restoreLoan/route');
const { POST: approveLoan } = await import('@/app/api/loan/approveLoan/route');
const { POST: updateLoan } = await import('@/app/api/loan/updateLoan/route');
const { POST: getAvailabilities } = await import('@/app/api/availability/getAvailabilities/route');

const post = (
  handler: (request: Request) => Promise<Response>,
  path: string,
  body: unknown,
) => handler(new Request(`http://localhost/api/${path}`, { method: 'POST', body: JSON.stringify(body) }));

const start = new Date('2026-10-01T09:00:00Z');
const end = new Date('2026-10-05T09:00:00Z');

async function makeLoan(amount = 4) {
  return prisma.loan.create({
    data: {
      id: `${prefix}-loan-${Math.random()}`,
      userId: adminId,
      startTime: start,
      endTime: end,
      status: LoanStatus.ACCEPTED,
      reservations: {
        create: [{ itemId, amount, status: ReservationStatus.ACCEPTED }],
      },
    },
  });
}

/** How many of the test item are free over the loan's own date range. */
async function availableNow(): Promise<number> {
  const response = await post(getAvailabilities, 'availability/getAvailabilities', {
    StartDate: start,
    EndDate: end,
  });
  const body = (await response.json()) as {
    availabilities: Record<string, { available: number }>;
  };
  return body.availabilities[itemId].available;
}

describe('loan soft delete', () => {
  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { id: `${prefix}-admin`, email: `${prefix}-admin@test.com`, group: Group.ADMIN },
    });
    adminId = admin.id;
    const item = await prisma.item.create({
      data: { id: `${prefix}-item`, name: 'Teltta', amount: 10 },
    });
    itemId = item.id;
  });

  beforeEach(async () => {
    guard.admin = true;
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
  });

  afterAll(async () => {
    await prisma.loanHistory.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.reservation.deleteMany({ where: { loan: { userId: adminId } } });
    await prisma.loan.deleteMany({ where: { userId: adminId } });
    await prisma.item.deleteMany({ where: { id: itemId } });
    await prisma.user.deleteMany({ where: { id: adminId } });
    await prisma.$disconnect();
  });

  it('stamps deletedAt and logs the deletion', async () => {
    const loan = await makeLoan();

    const response = await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });
    expect(response.status).toBe(200);

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.deletedAt).toBeInstanceOf(Date);

    const history = await prisma.loanHistory.findMany({ where: { loanId: loan.id } });
    expect(history.map((h) => h.action)).toContain('DELETED');
  });

  it('keeps the reservations, so a restore needs no rebuilding', async () => {
    const loan = await makeLoan();
    await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });

    const reservations = await prisma.reservation.findMany({ where: { loanId: loan.id } });
    expect(reservations).toHaveLength(1);
    expect(reservations[0].status).toBe(ReservationStatus.ACCEPTED);
  });

  it('frees the kamat it was holding', async () => {
    const loan = await makeLoan(4);
    expect(await availableNow()).toBe(6);

    await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });
    expect(await availableNow()).toBe(10);

    await post(restoreLoan, 'loan/restoreLoan', { id: loan.id });
    expect(await availableNow()).toBe(6);
  });

  it('refuses to delete the same loan twice', async () => {
    const loan = await makeLoan();
    await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });

    const second = await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });
    expect(second.status).toBe(409);
  });

  it('404s for a loan that never existed', async () => {
    const response = await post(deleteLoan, 'loan/deleteLoan', { id: `${prefix}-nope` });
    expect(response.status).toBe(404);
  });

  it('lets only an admin delete', async () => {
    const loan = await makeLoan();
    guard.admin = false;

    const response = await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });
    expect(response.status).toBe(401);

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.deletedAt).toBeNull();
  });

  it('restores a deleted loan and logs it', async () => {
    const loan = await makeLoan();
    await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });

    const response = await post(restoreLoan, 'loan/restoreLoan', { id: loan.id });
    expect(response.status).toBe(200);

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.deletedAt).toBeNull();

    const history = await prisma.loanHistory.findMany({ where: { loanId: loan.id } });
    expect(history.map((h) => h.action)).toContain('RESTORED');
  });

  it('refuses to restore a loan that is not deleted', async () => {
    const loan = await makeLoan();
    const response = await post(restoreLoan, 'loan/restoreLoan', { id: loan.id });
    expect(response.status).toBe(409);
  });

  it('is frozen while deleted: no approving, no editing', async () => {
    const loan = await makeLoan();
    await post(deleteLoan, 'loan/deleteLoan', { id: loan.id });

    const approved = await post(approveLoan, 'loan/approveLoan', { id: loan.id });
    expect(approved.status).toBe(404);

    const edited = await post(updateLoan, 'loan/updateLoan', {
      id: loan.id,
      startTime: start,
      endTime: end,
      description: 'muokattu',
      reservations: [{ amount: 1, item: { connect: { id: itemId } } }],
    });
    expect(edited.status).toBe(409);

    const stored = await prisma.loan.findUnique({ where: { id: loan.id } });
    expect(stored?.status).toBe(LoanStatus.ACCEPTED);
    expect(stored?.description).toBeNull();
  });
});
