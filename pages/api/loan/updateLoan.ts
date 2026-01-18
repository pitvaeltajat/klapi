import prisma from '../../../utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { ReservationStatus } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) {
      return res.status(401).json({ message: 'Kirjaudu sisään' });
    }

    const { id, reservations, startTime, endTime, description } = req.body;

    // Check that user is admin or owns this loan
    const existingLoan = await prisma.loan.findUnique({
      where: { id },
      select: { userId: true, status: true, reservations: { select: { status: true } } },
    });

    if (!existingLoan) {
      return res.status(404).json({ message: 'Lainaa ei löydy' });
    }

    const isAdmin = session.user.group === 'ADMIN';
    const isOwner = session.user.id === existingLoan.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Sinulla ei ole oikeutta muokata tätä lainaa' });
    }

    // Non-admin users can only edit if reservation statuses allow
    // Check if any reservation is INUSE or RETURNED
    const hasInuseOrReturned = existingLoan.reservations.some(
      (r) => r.status === ReservationStatus.INUSE || r.status === ReservationStatus.RETURNED,
    );
    if (!isAdmin && hasInuseOrReturned) {
      return res.status(403).json({ message: 'Lainaa ei voi muokata tässä tilassa' });
    }

    // Validate availability for each item in reservations
    const requestedReservations = reservations as Array<{
      amount: number;
      item: { connect: { id: string } };
    }>;

    // Get all items to check their total amounts
    const items = await prisma.item.findMany({});
    const itemMap = new Map(items.map((item) => [item.id, item]));

    // Get all other reservations that overlap with the requested date range
    const requestedStart = new Date(startTime);
    const requestedEnd = new Date(endTime);

    // Get all other reservations that overlap with the requested date range
    // Only ACCEPTED and INUSE reservations block availability
    // IN_BOX items are available for new loans
    const overlappingReservations = await prisma.reservation.findMany({
      where: {
        loan: {
          id: { not: id }, // Exclude current loan
          startTime: { lte: requestedEnd },
          endTime: { gte: requestedStart },
        },
        status: { notIn: [ReservationStatus.REJECTED, ReservationStatus.RETURNED, ReservationStatus.IN_BOX] },
      },
      include: { loan: true },
    });

    // Calculate availability for each item, accounting for date overlaps
    const calculateAvailability = (itemId: string): number => {
      const item = itemMap.get(itemId);
      if (!item) return 0;

      const totalAmount = item.amount;

      // For each day in the range, find the maximum reserved amount
      let maxReserved = 0;
      const currentDate = new Date(requestedStart);
      currentDate.setHours(0, 0, 0, 0);
      const endDateNorm = new Date(requestedEnd);
      endDateNorm.setHours(23, 59, 59, 999);

      while (currentDate <= endDateNorm) {
        const dayStart = new Date(currentDate);
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        // Sum reservations that overlap with this day
        const dayReserved = overlappingReservations
          .filter((r) => {
            const loanStart = new Date(r.loan.startTime);
            const loanEnd = new Date(r.loan.endTime);
            return r.itemId === itemId && loanStart <= dayEnd && loanEnd >= dayStart;
          })
          .reduce((sum, r) => sum + r.amount, 0);

        maxReserved = Math.max(maxReserved, dayReserved);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return totalAmount - maxReserved;
    };

    // Aggregate requested amounts by item
    const requestedByItem = new Map<string, number>();
    for (const res of requestedReservations) {
      const itemId = res.item.connect.id;
      const current = requestedByItem.get(itemId) ?? 0;
      requestedByItem.set(itemId, current + res.amount);
    }

    // Validate each item's availability
    const unavailableItems: string[] = [];
    for (const [itemId, requestedAmount] of Array.from(requestedByItem.entries())) {
      const item = itemMap.get(itemId);
      if (!item) {
        unavailableItems.push(`Tuotetta (${itemId}) ei löydy`);
        continue;
      }

      const available = calculateAvailability(itemId);

      if (requestedAmount > available) {
        unavailableItems.push(
          `${item.name}: pyydetty ${requestedAmount}, vapaana ${available}`,
        );
      }
    }

    if (unavailableItems.length > 0) {
      return res.status(400).json({
        message: 'Saatavuusvirhe: joitain tuotteita ei ole riittävästi vapaana',
        details: unavailableItems,
      });
    }

    // Determine the status for new reservations
    // If any existing reservation is INUSE, new ones should be INUSE too
    // Otherwise, use ACCEPTED as default
    const existingStatus = existingLoan.reservations[0]?.status || ReservationStatus.ACCEPTED;
    const reservationStatus =
      existingStatus === ReservationStatus.INUSE
        ? ReservationStatus.INUSE
        : ReservationStatus.ACCEPTED;

    // Add status to each reservation
    const reservationsWithStatus = reservations.map(
      (r: { amount: number; item: { connect: { id: string } } }) => ({
        ...r,
        status: reservationStatus,
      }),
    );

    const result = await prisma.loan.update({
      where: {
        id: id,
      },
      data: {
        reservations: {
          deleteMany: {},
          create: reservationsWithStatus,
        },
        startTime: startTime,
        endTime: endTime,
        description: description,
      },
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof Error) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(500).json({ message: 'Unknown error' });
    }
    return;
  }
}
