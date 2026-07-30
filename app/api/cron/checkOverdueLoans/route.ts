import { NextResponse } from 'next/server';
import { ReservationStatus, EmailType } from '@prisma/client';
import {
  sendOverdueAdminEmail,
  sendOverdueEmail,
  trySendEmail,
  type EmailOutcome,
} from '@/utils/emails';
import { shouldSendEmail } from '@/utils/emailLogHelpers';
import { formatDateNumeric } from '@/utils/dateFormat';
import prisma from '@/utils/prisma';

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron or has authorization
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find loans where:
    // 1. endTime has passed
    // 2. Reservations are NOT in IN_BOX or RETURNED state (meaning items haven't been returned)
    const overdueLoans = await prisma.loan.findMany({
      where: {
        endTime: {
          lt: now,
        },
        reservations: {
          some: {
            status: {
              notIn: [ReservationStatus.IN_BOX, ReservationStatus.RETURNED, ReservationStatus.REJECTED],
            },
          },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            emailWeeklyReminder: true,
          },
        },
        reservations: {
          select: {
            status: true,
          },
        },
      },
    });

    console.log(`Found ${overdueLoans.length} overdue loans`);

    // Borrowers are nudged on the same 1/3/7-day escalation the admins get,
    // rather than every single day — a daily mail for the same loan reads as
    // spam and stops being noticed by day three.
    const notificationIntervals = [1, 3, 7];
    const daysOverdueFor = (endTime: Date) =>
      Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24));

    const loansAtIntervals = overdueLoans.filter((loan) =>
      notificationIntervals.includes(daysOverdueFor(loan.endTime)),
    );

    // Send reminder emails to users who have overdue loans and want reminders
    const userEmailPromises = loansAtIntervals.map(async (loan): Promise<EmailOutcome | null> => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return null;
      }

      // Check if user wants reminder emails
      if (!loan.user.emailWeeklyReminder) {
        console.log(`User ${loan.userId} has disabled reminder emails`);
        return null;
      }

      // Check if we already sent this email recently (prevents duplicates from double cron execution)
      const canSend = await shouldSendEmail(
        loan.id,
        loan.userId,
        EmailType.OVERDUE_USER_REMINDER,
      );

      if (!canSend) {
        console.log(`Skipping overdue email for loan ${loan.id} - already sent recently`);
        return null;
      }

      const recipient = loan.user.email;
      return trySendEmail(`overdue reminder email for loan ${loan.id}`, () =>
        sendOverdueEmail(recipient, loan.id, daysOverdueFor(loan.endTime)),
      );
    });

    // Prepare admin notification for loans at specific overdue intervals (1, 3, 7 days)
    let adminEmailPromises: Promise<EmailOutcome | null>[] = [];

    console.log(`Found ${loansAtIntervals.length} loans at notification intervals (1, 3, or 7 days)`);

    if (loansAtIntervals.length > 0) {
      // Get all admins who want overdue notifications
      const admins = await prisma.user.findMany({
        where: {
          group: 'ADMIN',
          emailOverdueNotification: true,
          email: { not: null },
          deletedAt: null,
        },
      });

      adminEmailPromises = admins.map(async (admin): Promise<EmailOutcome | null> => {
        // Send one email per admin per interval
        // We need to check each loan individually to prevent duplicate sends
        const loansToNotify = [];

        for (const loan of loansAtIntervals) {
          const canSend = await shouldSendEmail(
            loan.id,
            admin.id,
            EmailType.OVERDUE_ADMIN_NOTIFICATION,
          );

          if (canSend) {
            loansToNotify.push(loan);
          }
        }

        if (loansToNotify.length === 0) {
          console.log(`No new overdue loans to notify ${admin.email} about`);
          return null;
        }

        // Create loan info for only the loans we're notifying about
        const loansToNotifyInfo = loansToNotify.map((loan) => ({
          id: loan.id,
          userName: loan.user.name || loan.user.email || 'Unknown',
          userEmail: loan.user.email,
          endTime: formatDateNumeric(loan.endTime),
          daysOverdue: daysOverdueFor(loan.endTime),
        }));

        // The query filters on `email: { not: null }`, so this is always set.
        const recipient = admin.email as string;
        return trySendEmail(
          `overdue admin email to ${recipient} for ${loansToNotifyInfo.length} loans`,
          () => sendOverdueAdminEmail(recipient, loansToNotifyInfo),
        );
      });
    }

    // Wait for all emails to be sent. Individual failures are swallowed by
    // trySendEmail so one bad send can't abort the sweep; they surface in the
    // tallies below.
    const outcomes = await Promise.all([...userEmailPromises, ...adminEmailPromises]);

    return NextResponse.json({
      message: 'Overdue loan check completed',
      overdueLoansCount: overdueLoans.length,
      emailsSent: outcomes.filter((outcome) => outcome === 'sent').length,
      emailsFailed: outcomes.filter((outcome) => outcome === 'failed').length,
    });
  } catch (error) {
    console.error('Error checking overdue loans:', error);
    return NextResponse.json({ message: 'Failed to check overdue loans' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
