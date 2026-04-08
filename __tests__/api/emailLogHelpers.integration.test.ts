import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient, EmailType, Group } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// We test the logic directly rather than importing from utils (which uses the singleton prisma)
// This mirrors the exact logic from emailLogHelpers.ts

async function wasEmailSentRecently(
  loanId: string,
  userId: string,
  emailType: EmailType,
  withinHours: number = 23,
): Promise<boolean> {
  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const recentEmail = await prisma.emailLog.findFirst({
    where: { loanId, userId, emailType, sentAt: { gte: cutoffTime } },
  });
  return recentEmail !== null;
}

async function recordEmailSent(
  loanId: string,
  userId: string,
  emailType: EmailType,
): Promise<void> {
  await prisma.emailLog.create({
    data: { loanId, userId, emailType },
  });
}

async function shouldSendEmail(
  loanId: string,
  userId: string,
  emailType: EmailType,
  withinHours: number = 23,
): Promise<boolean> {
  const wasSent = await wasEmailSentRecently(loanId, userId, emailType, withinHours);
  if (wasSent) return false;
  await recordEmailSent(loanId, userId, emailType);
  return true;
}

let testUserId: string;
let testLoanId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      id: `emaillog-test-user-${Date.now()}`,
      name: 'Email Log Test User',
      email: `emaillog-${Date.now()}@test.com`,
      group: Group.USER,
    },
  });
  testUserId = user.id;

  const item = await prisma.item.create({
    data: {
      id: `emaillog-test-item-${Date.now()}`,
      name: 'Email Log Test Item',
      amount: 1,
    },
  });

  const loan = await prisma.loan.create({
    data: {
      id: `emaillog-test-loan-${Date.now()}`,
      userId: user.id,
      status: 'ACCEPTED',
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000),
      description: 'Email log test',
      reservations: {
        create: [{ amount: 1, itemId: item.id }],
      },
    },
  });
  testLoanId = loan.id;
});

afterAll(async () => {
  await prisma.emailLog.deleteMany({ where: { loanId: testLoanId } });
  await prisma.reservation.deleteMany({ where: { loan: { id: testLoanId } } });
  await prisma.loan.deleteMany({ where: { id: testLoanId } });
  await prisma.item.deleteMany({ where: { id: { startsWith: 'emaillog-test-item' } } });
  await prisma.user.deleteMany({ where: { id: testUserId } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.emailLog.deleteMany({ where: { loanId: testLoanId } });
});

describe('wasEmailSentRecently', () => {
  it('should return false when no email was sent', async () => {
    const result = await wasEmailSentRecently(
      testLoanId,
      testUserId,
      EmailType.EXPIRING_LOAN_REMINDER,
    );
    expect(result).toBe(false);
  });

  it('should return true when email was sent recently', async () => {
    await recordEmailSent(testLoanId, testUserId, EmailType.EXPIRING_LOAN_REMINDER);

    const result = await wasEmailSentRecently(
      testLoanId,
      testUserId,
      EmailType.EXPIRING_LOAN_REMINDER,
    );
    expect(result).toBe(true);
  });

  it('should return false for a different email type', async () => {
    await recordEmailSent(testLoanId, testUserId, EmailType.EXPIRING_LOAN_REMINDER);

    const result = await wasEmailSentRecently(
      testLoanId,
      testUserId,
      EmailType.OVERDUE_USER_REMINDER,
    );
    expect(result).toBe(false);
  });

  it('should return false for a different user', async () => {
    await recordEmailSent(testLoanId, testUserId, EmailType.EXPIRING_LOAN_REMINDER);

    const result = await wasEmailSentRecently(
      testLoanId,
      'nonexistent-user',
      EmailType.EXPIRING_LOAN_REMINDER,
    );
    expect(result).toBe(false);
  });

  it('should return false when email was sent outside the time window', async () => {
    // Create an email log entry with a past sentAt time (25 hours ago)
    await prisma.emailLog.create({
      data: {
        loanId: testLoanId,
        userId: testUserId,
        emailType: EmailType.EXPIRING_LOAN_REMINDER,
        sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      },
    });

    const result = await wasEmailSentRecently(
      testLoanId,
      testUserId,
      EmailType.EXPIRING_LOAN_REMINDER,
      23,
    );
    expect(result).toBe(false);
  });

  it('should respect custom withinHours parameter', async () => {
    // Create an email log entry 2 hours ago
    await prisma.emailLog.create({
      data: {
        loanId: testLoanId,
        userId: testUserId,
        emailType: EmailType.PICKUP_REMINDER,
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    });

    // Within 1 hour window: should be false (2h ago > 1h window)
    expect(
      await wasEmailSentRecently(testLoanId, testUserId, EmailType.PICKUP_REMINDER, 1),
    ).toBe(false);

    // Within 3 hour window: should be true (2h ago < 3h window)
    expect(
      await wasEmailSentRecently(testLoanId, testUserId, EmailType.PICKUP_REMINDER, 3),
    ).toBe(true);
  });
});

describe('shouldSendEmail', () => {
  it('should return true and record when no recent email exists', async () => {
    const result = await shouldSendEmail(
      testLoanId,
      testUserId,
      EmailType.OVERDUE_USER_REMINDER,
    );
    expect(result).toBe(true);

    // Verify it was recorded
    const log = await prisma.emailLog.findFirst({
      where: {
        loanId: testLoanId,
        userId: testUserId,
        emailType: EmailType.OVERDUE_USER_REMINDER,
      },
    });
    expect(log).not.toBeNull();
  });

  it('should return false when email was already sent recently', async () => {
    // First call should succeed
    const first = await shouldSendEmail(
      testLoanId,
      testUserId,
      EmailType.OVERDUE_ADMIN_NOTIFICATION,
    );
    expect(first).toBe(true);

    // Second call should be deduplicated
    const second = await shouldSendEmail(
      testLoanId,
      testUserId,
      EmailType.OVERDUE_ADMIN_NOTIFICATION,
    );
    expect(second).toBe(false);
  });

  it('should allow different email types for the same loan', async () => {
    const result1 = await shouldSendEmail(
      testLoanId,
      testUserId,
      EmailType.EXPIRING_LOAN_REMINDER,
    );
    const result2 = await shouldSendEmail(
      testLoanId,
      testUserId,
      EmailType.PICKUP_REMINDER,
    );

    expect(result1).toBe(true);
    expect(result2).toBe(true);
  });
});
