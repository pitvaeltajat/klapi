import { NextResponse, after } from 'next/server';
import prisma from '@/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ReservationStatus } from '@prisma/client';
import { logLoanHistory } from '@/utils/loanHistory';
import { sendNewLoanEmail } from '@/app/api/email/sendNewLoanToAdmin/route';
import { sendCreatedEmail } from '@/app/api/email/sendNewLoanToUser/route';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Ei kirjautunut' }, { status: 401 });
    }

    const { reservations, startTime, endTime, userId, description, loaner } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, group: true },
    });
    if (!user) {
      return NextResponse.json({ message: 'Käyttäjää ei löytynyt' }, { status: 404 });
    }

    if (session.user.group === 'KIOSK' && user.group === 'KIOSK') {
      return NextResponse.json({ message: 'Kioskilainaa ei voi yhdistää kioskitiliin' }, { status: 400 });
    }

    // If made by kiosk, set status to INUSE immediately. The loan starts from the moment it is made.
    // Check the session user's group (who is creating the loan), not the target user's group
    const loanStatus = session.user.group === 'KIOSK' ? 'INUSE' : 'ACCEPTED';
    const reservationStatus: ReservationStatus =
      session.user.group === 'KIOSK' ? ReservationStatus.INUSE : ReservationStatus.ACCEPTED;

    // Ensure referenced items exist; for custom items (client-generated ids)
    // create temporary Item records and replace itemId accordingly.
    const requestedIds = (reservations as { itemId: string }[]).map((r) => r.itemId);
    const existingItems = await prisma.item.findMany({
      where: { id: { in: requestedIds } },
      select: { id: true },
    });
    const existingIds = new Set(existingItems.map((i) => i.id));

    const processedReservations: { itemId: string; amount: number }[] = [];
    for (const r of reservations) {
      let itemId = r.itemId as string;
      if (!existingIds.has(itemId)) {
        if (!r.name) {
          return NextResponse.json({ message: `Missing name for custom item ${itemId}` }, { status: 400 });
        }
        const created = await prisma.item.create({
          data: {
            name: r.name,
            description: 'Automaattisesti luotu väliaikainen item',
            amount: r.amount ?? 1,
            type: 'temporary',
          },
        });
        itemId = created.id;
      }
      processedReservations.push({ itemId, amount: r.amount });
    }

    // Find any IN_BOX reservations for the items being reserved
    // These need to be marked as RETURNED since the items are being taken from the box
    const itemIds = processedReservations.map((r) => r.itemId);
    const inBoxReservations = await prisma.reservation.findMany({
      where: {
        itemId: { in: itemIds },
        status: ReservationStatus.IN_BOX,
      },
    });

    // Mark IN_BOX reservations as RETURNED (items are being picked up from box)
    if (inBoxReservations.length > 0) {
      await prisma.reservation.updateMany({
        where: {
          id: { in: inBoxReservations.map((r) => r.id) },
        },
        data: {
          status: ReservationStatus.RETURNED,
        },
      });
    }

    const createReservations = processedReservations.map((r) => ({
      amount: r.amount,
      item: { connect: { id: r.itemId } },
      status: reservationStatus,
    }));

    const result = await prisma.loan.create({
      data: {
        reservations: { create: createReservations },
        startTime: startTime,
        endTime: endTime,
        user: { connect: { id: userId } },
        description,
        loaner,
        status: loanStatus,
      },
    });

    await logLoanHistory({
      loanId: result.id,
      action: 'CREATED',
      actedById: session.user.id,
      details: {
        status: loanStatus,
        itemCount: createReservations.length,
        loaner: loaner ?? null,
        description: description ?? null,
      },
    });

    // Emails are sent after the response is returned so a slow SES call
    // can't time out the request. Failures are logged; the loan is already committed.
    if (loanStatus === 'ACCEPTED') {
      if (user.email && user.group !== 'ADMIN') {
        const userPrefs = await prisma.user.findUnique({
          where: { id: userId },
          select: { emailNewLoanNotification: true },
        });

        if (userPrefs?.emailNewLoanNotification !== false) {
          const recipient = user.email;
          after(async () => {
            try {
              await sendCreatedEmail(recipient, result.id);
            } catch (error) {
              console.error('Failed to send user email:', error);
            }
          });
        }
      }

      const creatorName = user.name ?? '';
      after(async () => {
        try {
          await sendNewLoanEmail(creatorName, result.id);
        } catch (error) {
          console.error('Failed to send admin email:', error);
        }
      });
    }

    if (loanStatus === 'INUSE' && session.user.group === 'KIOSK') {
      const creatorName = user.name || 'Kiosk-käyttäjä';
      after(async () => {
        try {
          await sendNewLoanEmail(creatorName, result.id);
        } catch (error) {
          console.error('Failed to send admin email for kiosk loan:', error);
        }
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ message: err.message }, { status: 500 });
    } else {
      return NextResponse.json({ message: 'Unknown error' }, { status: 500 });
    }
  }
}
