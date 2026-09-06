import { NextResponse, after } from 'next/server';
import prisma from '@/utils/prisma';
import { auth } from '@/lib/auth';
import { ReservationStatus } from '@prisma/client';
import { createTemporaryItems } from '@/utils/temporaryItems';
import { isKioskMachine, loanStartsNow } from '@/utils/kioskSession';
import { logLoanHistory, resolveLoanActor } from '@/utils/loanHistory';
import { sendCreatedEmail, sendNewLoanEmail } from '@/utils/emails';
import { syncLoanCalendarInBackground } from '@/utils/loanCalendar';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Ei kirjautunut' }, { status: 401 });
    }

    const { reservations, startTime, endTime, userId, description, loaner, reportContent } =
      await request.json();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, group: true, emailNewLoanNotification: true },
    });
    if (!user) {
      return NextResponse.json({ message: 'Käyttäjää ei löytynyt' }, { status: 404 });
    }

    // A loan made at the kaluston kone is one somebody is walking away with, so
    // it starts INUSE rather than waiting to be marked picked up. What matters is
    // the machine it was made on — the session creating the loan, not the target
    // user's group — and that covers an admin PIN-elevated on the kiosk too: the
    // gear leaves the store room either way.
    //
    // Except when the start time says otherwise. An elevated admin can book a
    // later date from the kiosk, and nothing that starts next week is in use
    // today; those wait for `cron/startDueLoans` like any other reservation.
    const startedAtKiosk = isKioskMachine(session.user) && loanStartsNow(startTime);
    const loanStatus = startedAtKiosk ? 'INUSE' : 'ACCEPTED';
    const reservationStatus: ReservationStatus = startedAtKiosk
      ? ReservationStatus.INUSE
      : ReservationStatus.ACCEPTED;

    // Ensure referenced items exist; for custom items (client-generated ids)
    // create temporary Item records and replace itemId accordingly.
    const requestedIds = (reservations as { itemId: string }[]).map((r) => r.itemId);
    const existingItems = await prisma.item.findMany({
      where: { id: { in: requestedIds }, deletedAt: null },
      select: { id: true },
    });
    const existingIds = new Set(existingItems.map((i) => i.id));

    const customReservations = (
      reservations as { itemId: string; name?: string; amount: number }[]
    ).filter((r) => !existingIds.has(r.itemId));
    for (const r of customReservations) {
      if (!r.name) {
        return NextResponse.json(
          { message: `Missing name for custom item ${r.itemId}` },
          { status: 400 },
        );
      }
    }
    const customIdByOriginal = await createTemporaryItems(customReservations);

    const processedReservations: { itemId: string; amount: number }[] = (
      reservations as { itemId: string; amount: number }[]
    ).map((r) => ({
      itemId: customIdByOriginal.get(r.itemId) ?? r.itemId,
      amount: r.amount,
    }));

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

    const trimmedReport = typeof reportContent === 'string' ? reportContent.trim() : '';
    if (trimmedReport !== '') {
      await prisma.report.create({
        data: {
          loanId: result.id,
          content: trimmedReport,
          created: 'BEFORE_LOAN',
        },
      });
    }

    await logLoanHistory({
      loanId: result.id,
      action: 'CREATED',
      ...resolveLoanActor(session),
      details: {
        status: loanStatus,
        itemCount: createReservations.length,
        loaner: loaner ?? null,
        description: description ?? null,
      },
    });

    syncLoanCalendarInBackground(result.id);

    // Emails are sent after the response is returned so a slow SES call
    // can't time out the request. Failures are logged; the loan is already committed.
    if (loanStatus === 'ACCEPTED') {
      if (user.email && user.group !== 'ADMIN' && user.emailNewLoanNotification !== false) {
        const recipient = user.email;
        after(async () => {
          try {
            await sendCreatedEmail(recipient, result.id);
          } catch (error) {
            console.error('Failed to send user email:', error);
          }
        });
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

    if (startedAtKiosk) {
      // Kiosk loans are attributed to whoever the operator picked in the
      // "Lainaaja" field. When that's a real user account (not a free-text name,
      // which falls back to the kiosk's own account), the loan lands in their
      // account and they should hear about it — the loan is already INUSE, so the
      // email uses the "already in use" wording.
      if (
        user.email &&
        user.group !== 'ADMIN' &&
        user.group !== 'KIOSK' &&
        user.emailNewLoanNotification !== false
      ) {
        const recipient = user.email;
        after(async () => {
          try {
            await sendCreatedEmail(recipient, result.id, true);
          } catch (error) {
            console.error('Failed to send loaner email for kiosk loan:', error);
          }
        });
      }

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
