import { PrismaClient, ReservationStatus, EmailType } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getBaseUrl } from '../../../utils/urlHelpers';
import { shouldSendEmail } from '../../../utils/emailLogHelpers';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is from Vercel Cron or has authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const baseUrl = getBaseUrl();

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
    const pickupReminderPromises = upcomingPickupLoans.map(async (loan) => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return;
      }

      // Check if user wants reminder emails
      const user = await prisma.user.findUnique({
        where: { id: loan.userId },
        select: { emailWeeklyReminder: true },
      });

      if (!user?.emailWeeklyReminder) {
        console.log(`User ${loan.userId} has disabled reminder emails`);
        return;
      }

      // Check if we already sent this email recently
      const canSend = await shouldSendEmail(
        loan.id,
        loan.userId,
        EmailType.PICKUP_REMINDER,
      );

      if (!canSend) {
        console.log(`Skipping pickup reminder for loan ${loan.id} - already sent recently`);
        return;
      }

      try {
        const response = await fetch(
          `${baseUrl}/api/email/sendPickupReminder`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: loan.user.email,
              id: loan.id,
              startTime: loan.startTime.toLocaleString('fi-FI', {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to send pickup reminder email for loan ${loan.id}`);
        }

        console.log(`Sent pickup reminder email for loan ${loan.id}`);
      } catch (error) {
        console.error(`Error sending pickup reminder email for loan ${loan.id}:`, error);
      }
    });

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

    // Send reminder emails to users (only if they have emailWeeklyReminder enabled)
    const userEmailPromises = expiringLoans.map(async (loan) => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return;
      }

      // Check if user wants reminder emails
      const user = await prisma.user.findUnique({
        where: { id: loan.userId },
        select: { emailWeeklyReminder: true },
      });

      if (!user?.emailWeeklyReminder) {
        console.log(`User ${loan.userId} has disabled reminder emails`);
        return;
      }

      // Check if we already sent this email recently
      const canSend = await shouldSendEmail(
        loan.id,
        loan.userId,
        EmailType.EXPIRING_LOAN_REMINDER,
      );

      if (!canSend) {
        console.log(`Skipping expiring loan reminder for loan ${loan.id} - already sent recently`);
        return;
      }

      try {
        const response = await fetch(
          `${baseUrl}/api/email/sendReminder`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: loan.user.email,
              id: loan.id,
              description: loan.description,
              endTime: loan.endTime.toLocaleString('fi-FI', {
                dateStyle: 'short',
                timeStyle: 'short',
              }),
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`Failed to send email for loan ${loan.id}`);
        }

        console.log(`Sent reminder email for loan ${loan.id}`);
      } catch (error) {
        console.error(`Error sending email for loan ${loan.id}:`, error);
      }
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
    let adminEmailPromises: Promise<void>[] = [];
    if (oldBoxLoans.length > 0) {
      // Get all admins who want old box notifications
      const admins = await prisma.user.findMany({
        where: {
          group: 'ADMIN',
          emailOldBoxNotification: true,
          email: { not: null },
        },
      });

      const loanInfo = oldBoxLoans.map((loan) => ({
        id: loan.id,
        userName: loan.user.name || loan.user.email || 'Unknown',
        startTime: loan.startTime.toLocaleString('fi-FI', {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
        boxName: loan.box?.name,
      }));

      adminEmailPromises = admins.map(async (admin) => {
        if (!admin.email) return;

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
          return;
        }

        try {
          const response = await fetch(
            `${baseUrl}/api/email/sendAdminReminder`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                email: admin.email,
                loans: loanInfo,
              }),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to send admin email to ${admin.email}`);
          }

          console.log(`Sent admin reminder email to ${admin.email}`);
        } catch (error) {
          console.error(`Error sending admin email to ${admin.email}:`, error);
        }
      });
    }

    await Promise.all([...pickupReminderPromises, ...userEmailPromises, ...adminEmailPromises]);

    res.status(200).json({
      message: 'Cron job completed',
      upcomingPickupLoansChecked: upcomingPickupLoans.length,
      expiringLoansChecked: expiringLoans.length,
      oldBoxLoansChecked: oldBoxLoans.length,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
  } finally {
    await prisma.$disconnect();
  }
}
