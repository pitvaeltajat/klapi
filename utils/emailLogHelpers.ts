import { EmailType } from '@prisma/client';
import prisma from './prisma';

/**
 * Check if an email of the specified type has been sent recently for a loan
 * @param loanId - The loan ID
 * @param userId - The user ID receiving the email
 * @param emailType - The type of email to check
 * @param withinHours - Only consider emails sent within this many hours (default: 23)
 * @returns true if email was sent recently, false otherwise
 */
export async function wasEmailSentRecently(
  loanId: string,
  userId: string,
  emailType: EmailType,
  withinHours: number = 23,
): Promise<boolean> {
  const cutoffTime = new Date(Date.now() - withinHours * 60 * 60 * 1000);

  const recentEmail = await prisma.emailLog.findFirst({
    where: {
      loanId,
      userId,
      emailType,
      sentAt: {
        gte: cutoffTime,
      },
    },
  });

  return recentEmail !== null;
}

/**
 * Record that an email was sent
 * @param loanId - The loan ID
 * @param userId - The user ID receiving the email
 * @param emailType - The type of email sent
 */
export async function recordEmailSent(
  loanId: string,
  userId: string,
  emailType: EmailType,
): Promise<void> {
  await prisma.emailLog.create({
    data: {
      loanId,
      userId,
      emailType,
    },
  });
}

/**
 * Check if email should be sent, and record it if so
 * This combines the check and record operations in a safe way
 * @param loanId - The loan ID
 * @param userId - The user ID receiving the email
 * @param emailType - The type of email to send
 * @param withinHours - Only consider emails sent within this many hours (default: 23)
 * @returns true if email should be sent (and has been recorded), false if it was sent recently
 */
export async function shouldSendEmail(
  loanId: string,
  userId: string,
  emailType: EmailType,
  withinHours: number = 23,
): Promise<boolean> {
  const wasSent = await wasEmailSentRecently(loanId, userId, emailType, withinHours);

  if (wasSent) {
    return false;
  }

  // Record that we're sending it now
  await recordEmailSent(loanId, userId, emailType);
  return true;
}
