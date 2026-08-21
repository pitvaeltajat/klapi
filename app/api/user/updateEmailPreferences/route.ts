import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';
import { requireUser } from '@/utils/apiAuth';

/**
 * Updates the notification toggles for the signed-in user, or — for an ADMIN —
 * for someone else via `userId`. The route is named for the email ones it
 * started with; `calendarLoanEvents` (the loan calendar invite) rides along
 * because it sits in the same section of `/account`.
 *
 * The admin path exists for `/admin/user/[userId]`: "lopeta noiden viestien
 * lähettäminen" is a thing people ask an admin in person, and the alternative
 * was an admin talking them through their own account page. Anyone else naming
 * a `userId` other than their own is refused rather than silently redirected to
 * their own row — a client that thought it was editing someone else must not be
 * told it succeeded.
 */
export async function POST(request: Request) {
  const { session, denied } = await requireUser();
  if (denied) return denied;

  const {
    userId,
    emailWeeklyReminder,
    emailNewLoanNotification,
    emailExpiringReminder,
    emailOldBoxNotification,
    emailOverdueNotification,
    calendarLoanEvents,
  } = await request.json();

  let targetId = session.user.id;
  if (typeof userId === 'string' && userId !== session.user.id) {
    if (session.user.group !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Sinulla ei ole oikeutta tähän toimintoon' },
        { status: 401 },
      );
    }
    targetId = userId;
  }

  try {
    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: {
        emailWeeklyReminder: emailWeeklyReminder !== undefined ? emailWeeklyReminder : undefined,
        emailNewLoanNotification:
          emailNewLoanNotification !== undefined ? emailNewLoanNotification : undefined,
        emailExpiringReminder:
          emailExpiringReminder !== undefined ? emailExpiringReminder : undefined,
        emailOldBoxNotification:
          emailOldBoxNotification !== undefined ? emailOldBoxNotification : undefined,
        emailOverdueNotification:
          emailOverdueNotification !== undefined ? emailOverdueNotification : undefined,
        calendarLoanEvents: calendarLoanEvents !== undefined ? calendarLoanEvents : undefined,
      },
    });

    return NextResponse.json({
      message: 'Email preferences updated',
      emailWeeklyReminder: updatedUser.emailWeeklyReminder,
      emailNewLoanNotification: updatedUser.emailNewLoanNotification,
      emailExpiringReminder: updatedUser.emailExpiringReminder,
      emailOldBoxNotification: updatedUser.emailOldBoxNotification,
      emailOverdueNotification: updatedUser.emailOverdueNotification,
      calendarLoanEvents: updatedUser.calendarLoanEvents,
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
