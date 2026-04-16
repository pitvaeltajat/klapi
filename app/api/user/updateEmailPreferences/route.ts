import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/utils/prisma';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { emailWeeklyReminder, emailNewLoanNotification, emailOldBoxNotification, emailOverdueNotification } = await request.json();

  try {
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        emailWeeklyReminder: emailWeeklyReminder !== undefined ? emailWeeklyReminder : undefined,
        emailNewLoanNotification:
          emailNewLoanNotification !== undefined ? emailNewLoanNotification : undefined,
        emailOldBoxNotification:
          emailOldBoxNotification !== undefined ? emailOldBoxNotification : undefined,
        emailOverdueNotification:
          emailOverdueNotification !== undefined ? emailOverdueNotification : undefined,
      },
    });

    return NextResponse.json({
      message: 'Email preferences updated',
      emailWeeklyReminder: updatedUser.emailWeeklyReminder,
      emailNewLoanNotification: updatedUser.emailNewLoanNotification,
      emailOldBoxNotification: updatedUser.emailOldBoxNotification,
      emailOverdueNotification: updatedUser.emailOverdueNotification,
    });
  } catch (error) {
    console.error('Error updating email preferences:', error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  } finally {
    await prisma.$disconnect();
  }
}
