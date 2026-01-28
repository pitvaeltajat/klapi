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

    // Send reminder emails to users who have overdue loans and want reminders
    const userEmailPromises = overdueLoans.map(async (loan) => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return;
      }

      // Check if user wants reminder emails
      if (!loan.user.emailWeeklyReminder) {
        console.log(`User ${loan.userId} has disabled reminder emails`);
        return;
      }

      // Check if we already sent this email recently (prevents duplicates from double cron execution)
      const canSend = await shouldSendEmail(
        loan.id,
        loan.userId,
        EmailType.OVERDUE_USER_REMINDER,
      );

      if (!canSend) {
        console.log(`Skipping overdue email for loan ${loan.id} - already sent recently`);
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/api/email/sendOverdueToUser`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: loan.user.email,
            id: loan.id,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send overdue email for loan ${loan.id}`);
        }

        console.log(`Sent overdue reminder email for loan ${loan.id}`);
      } catch (error) {
        console.error(`Error sending overdue email for loan ${loan.id}:`, error);
      }
    });

    // Prepare admin notification if there are overdue loans
    let adminEmailPromises: Promise<void>[] = [];
    if (overdueLoans.length > 0) {
      // Get all admins who want weekly reminders
      const admins = await prisma.user.findMany({
        where: {
          group: 'ADMIN',
          emailWeeklyReminder: true,
          email: { not: null },
        },
      });

      const loanInfo = overdueLoans.map((loan) => {
        const daysOverdue = Math.floor(
          (now.getTime() - loan.endTime.getTime()) / (1000 * 60 * 60 * 24),
        );

        return {
          id: loan.id,
          userName: loan.user.name || loan.user.email || 'Unknown',
          userEmail: loan.user.email,
          endTime: loan.endTime.toLocaleString('fi-FI', {
            dateStyle: 'short',
            timeStyle: 'short',
          }),
          daysOverdue,
        };
      });

      adminEmailPromises = admins.map(async (admin) => {
        // For admin notifications, we check per-admin, not per-loan
        // Use the first overdue loan ID as a reference for tracking
        const referenceLoanId = overdueLoans[0].id;

        // Check if we already sent this admin notification recently
        const canSend = await shouldSendEmail(
          referenceLoanId,
          admin.id,
          EmailType.OVERDUE_ADMIN_NOTIFICATION,
        );

        if (!canSend) {
          console.log(`Skipping admin notification to ${admin.email} - already sent recently`);
          return;
        }

        try {
          const response = await fetch(`${baseUrl}/api/email/sendOverdueToAdmin`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: admin.email,
              loans: loanInfo,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to send overdue admin email to ${admin.email}`);
          }

          console.log(`Sent overdue admin email to ${admin.email}`);
        } catch (error) {
          console.error(`Error sending overdue admin email to ${admin.email}:`, error);
        }
      });
    }

    // Wait for all emails to be sent
    await Promise.all([...userEmailPromises, ...adminEmailPromises]);

    return res.status(200).json({
      message: 'Overdue loan check completed',
      overdueLoansCount: overdueLoans.length,
    });
  } catch (error) {
    console.error('Error checking overdue loans:', error);
    return res.status(500).json({ message: 'Failed to check overdue loans' });
  } finally {
    await prisma.$disconnect();
  }
}
