import { NextResponse } from 'next/server';
import { ReservationStatus, EmailType } from '@prisma/client';
import {
  sendAdminReminderEmail,
  sendPickupReminderEmail,
  sendReminderEmail,
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
    // Get current time and 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find loans that start in 24-25 hours and have ACCEPTED reservations (not picked up yet)
    // A loan hasn't been picked up if all reservations are still ACCEPTED (none are INUSE)
    const allLoansStartingTomorrow = await prisma.loan.findMany({
      where: {
        startTime: {
          gte: tomorrow,
          lte: dayAfterTomorrow,
        },
      },
      include: {
        user: true,
        reservations: {
          select: {
            status: true,
          },
        },
      },
    });

    // Filter to only loans where all reservations are still ACCEPTED (not picked up)
    const upcomingPickupLoans = allLoansStartingTomorrow.filter((loan) => {
      return (
        loan.reservations.length > 0 &&
        loan.reservations.every((res) => res.status === ReservationStatus.ACCEPTED)
      );
    });

    console.log(`Found ${upcomingPickupLoans.length} upcoming pickup loans`);

    // Send pickup reminder emails to users
    const pickupReminderPromises = upcomingPickupLoans.map(
      async (loan): Promise<EmailOutcome | null> => {
        if (!loan.user.email) {
          console.log(`Loan ${loan.id} has no user email`);
          return null;
        }

        // Check if user wants reminder emails
        const user = await prisma.user.findFirst({
          where: { id: loan.userId, deletedAt: null },
          select: { emailWeeklyReminder: true },
        });

        if (!user?.emailWeeklyReminder) {
          console.log(`User ${loan.userId} has disabled reminder emails`);
          return null;
        }

        // Check if we already sent this email recently
        const canSend = await shouldSendEmail(
          loan.id,
          loan.userId,
          EmailType.PICKUP_REMINDER,
        );

        if (!canSend) {
          console.log(`Skipping pickup reminder for loan ${loan.id} - already sent recently`);
          return null;
        }

        const recipient = loan.user.email;
        return trySendEmail(`pickup reminder email for loan ${loan.id}`, () =>
          sendPickupReminderEmail(recipient, loan.id),
        );
      },
    );

    // NOTE: there used to be a "muista merkitä lainasi käyttöön" nudge here for
    // loans past their start time but still ACCEPTED. `cron/startDueLoans` now
    // auto-starts every such loan, so the nudge only ever caught the few hours
    // between the two crons — and told the borrower to do something the system
    // does for them. Removed; `EmailType.PICKUP_OVERDUE_REMINDER` is kept in the
    // schema only so historical EmailLog rows still resolve.

    // Find loans that expire in the next 24-25 hours and have INUSE reservations
    const expiringLoans = await prisma.loan.findMany({
      where: {
        endTime: {
          gte: tomorrow,
          lte: dayAfterTomorrow,
        },
        reservations: {
          some: {
            status: ReservationStatus.INUSE,
          },
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${expiringLoans.length} expiring loans`);

    // Send reminder emails to users. This one is opt-in (emailExpiringReminder
    // defaults to false): most borrowers already know when their loan ends, and
    // the overdue mails cover the ones who forget.
    const userEmailPromises = expiringLoans.map(async (loan): Promise<EmailOutcome | null> => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return null;
      }

      // Check if user opted into end-of-loan reminders
      const user = await prisma.user.findFirst({
        where: { id: loan.userId, deletedAt: null },
        select: { emailExpiringReminder: true },
      });

      if (!user?.emailExpiringReminder) {
        console.log(`User ${loan.userId} has not enabled expiring-loan reminders`);
        return null;
      }

      // Check if we already sent this email recently
      const canSend = await shouldSendEmail(
        loan.id,
        loan.userId,
        EmailType.EXPIRING_LOAN_REMINDER,
      );

      if (!canSend) {
        console.log(`Skipping expiring loan reminder for loan ${loan.id} - already sent recently`);
        return null;
      }

      const recipient = loan.user.email;
      return trySendEmail(`reminder email for loan ${loan.id}`, () =>
        sendReminderEmail(recipient, loan.id),
      );
    });

    // Find loans that have IN_BOX reservations for over a week
    const oldBoxLoans = await prisma.loan.findMany({
      where: {
        startTime: {
          lte: oneWeekAgo,
        },
        reservations: {
          some: {
            status: ReservationStatus.IN_BOX,
          },
        },
      },
      include: {
        user: true,
        box: true,
      },
    });

    console.log(`Found ${oldBoxLoans.length} loans in boxes over a week`);

    // Send admin reminder emails if there are old box loans
    let adminEmailPromises: Promise<EmailOutcome | null>[] = [];
    if (oldBoxLoans.length > 0) {
      // Get all admins who want old box notifications
      const admins = await prisma.user.findMany({
        where: {
          group: 'ADMIN',
          emailOldBoxNotification: true,
          email: { not: null },
          deletedAt: null,
        },
      });

      const loanInfo = oldBoxLoans.map((loan) => ({
        id: loan.id,
        userName: loan.user.name || loan.user.email || 'Unknown',
        startTime: formatDateNumeric(loan.startTime),
        boxName: loan.box?.name,
      }));

      adminEmailPromises = admins.map(async (admin): Promise<EmailOutcome | null> => {
        if (!admin.email) return null;

        // For admin notifications, use the first old box loan ID as a reference
        const referenceLoanId = oldBoxLoans[0].id;

        // Check if we already sent this admin notification recently
        const canSend = await shouldSendEmail(
          referenceLoanId,
          admin.id,
          EmailType.OLD_BOX_ADMIN_NOTIFICATION,
        );

        if (!canSend) {
          console.log(`Skipping old box admin notification to ${admin.email} - already sent recently`);
          return null;
        }

        const recipient = admin.email;
        return trySendEmail(`admin reminder email to ${recipient}`, () =>
          sendAdminReminderEmail(recipient, loanInfo),
        );
      });
    }

    // Individual failures are swallowed by trySendEmail so one bad send can't
    // abort the sweep; they surface in the tallies below.
    const outcomes = await Promise.all([
      ...pickupReminderPromises,
      ...userEmailPromises,
      ...adminEmailPromises,
    ]);

    return NextResponse.json({
      message: 'Cron job completed',
      upcomingPickupLoansChecked: upcomingPickupLoans.length,
      expiringLoansChecked: expiringLoans.length,
      oldBoxLoansChecked: oldBoxLoans.length,
      emailsSent: outcomes.filter((outcome) => outcome === 'sent').length,
      emailsFailed: outcomes.filter((outcome) => outcome === 'failed').length,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  } finally {
    await prisma.$disconnect();
  }
}
