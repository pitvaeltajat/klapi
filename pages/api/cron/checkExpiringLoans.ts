import { PrismaClient } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verify the request is from Vercel Cron or has authorization
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Get current time and 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dayAfterTomorrow = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Find loans that expire in the next 24-25 hours and are active (INUSE or IN_BOX)
    const expiringLoans = await prisma.loan.findMany({
      where: {
        endTime: {
          gte: tomorrow,
          lte: dayAfterTomorrow,
        },
        status: {
          in: ['INUSE'],
        },
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${expiringLoans.length} expiring loans`);

    // Send reminder emails to users
    const userEmailPromises = expiringLoans.map(async (loan) => {
      if (!loan.user.email) {
        console.log(`Loan ${loan.id} has no user email`);
        return;
      }

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendReminder`,
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

    // Find loans that have been IN_BOX for over a week
    const oldBoxLoans = await prisma.loan.findMany({
      where: {
        status: 'IN_BOX',
        startTime: {
          lte: oneWeekAgo,
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
      // Get all admins who want weekly reminders
      const admins = await prisma.user.findMany({
        where: {
          group: 'ADMIN',
          emailWeeklyReminder: true,
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

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendAdminReminder`,
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

    await Promise.all([...userEmailPromises, ...adminEmailPromises]);

    res.status(200).json({
      message: 'Cron job completed',
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
