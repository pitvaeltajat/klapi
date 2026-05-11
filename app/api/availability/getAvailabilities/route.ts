import { NextResponse } from 'next/server';
import prisma from '@/utils/prisma';

export async function POST(request: Request) {
  const { StartDate, EndDate } = await request.json();

  // Add validation for dates
  if (!StartDate || !EndDate) {
    return NextResponse.json({
      error: 'Missing required dates',
      details: {
        StartDate: StartDate ? 'present' : 'missing',
        EndDate: EndDate ? 'present' : 'missing',
      },
    }, { status: 400 });
  }

  // Validate that the dates are valid
  const startDate = new Date(StartDate);
  const endDate = new Date(EndDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({
      error: 'Invalid date format',
      details: {
        StartDate: isNaN(startDate.getTime()) ? 'invalid' : 'valid',
        EndDate: isNaN(endDate.getTime()) ? 'invalid' : 'valid',
      },
    }, { status: 400 });
  }

  // Validate that end date is after start date
  if (endDate < startDate) {
    return NextResponse.json({
      error: 'End date must be after start date',
      dates: {
        StartDate,
        EndDate,
      },
    }, { status: 400 });
  }

  const items = await prisma.item.findMany({
    where: { deletedAt: null },
    include: {
      reservations: {
        include: {
          loan: true,
          item: true,
        },
      },
    },
  });
  // Filter out orphaned reservations (loan === null)
  const reservations = items.flatMap((item) => item.reservations).filter(r => r.loan !== null);

  const availabilities: Record<string, { byDate: Record<string, number>; available: number }> = {};

  await Promise.all(
    items.map(async (item) => {
      const amount = item.amount;
      const itemReservations = reservations.filter((reservation) => {
        return reservation.item.id == item.id;
      });

      if (EndDate != null) {
        let min = amount;
        availabilities[item.id] = { byDate: {}, available: 0 };

        const requestedStart = new Date(StartDate);
        const requestedEnd = new Date(EndDate);
        requestedStart.setHours(0, 0, 0, 0);
        requestedEnd.setHours(23, 59, 59, 999);

        const currentDate = new Date(requestedStart);
        while (currentDate <= requestedEnd) {
          const dayStart = new Date(currentDate);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(currentDate);
          dayEnd.setHours(23, 59, 59, 999);

          let sum = 0;
          for (const reservation of itemReservations) {
            const loanStart = new Date(reservation.loan.startTime);
            const loanEnd = new Date(reservation.loan.endTime);

            const overlaps = loanStart <= dayEnd && loanEnd >= dayStart;
            const blocksAvailability =
              reservation.status !== 'REJECTED' &&
              reservation.status !== 'RETURNED' &&
              reservation.status !== 'IN_BOX';

            if (overlaps && blocksAvailability) {
              sum += reservation.amount;
            }
          }

          availabilities[item.id].byDate[currentDate.toISOString()] = amount - sum;

          if (amount - sum < min) {
            min = amount - sum;
          }

          currentDate.setDate(currentDate.getDate() + 1);
        }
        availabilities[item.id].available = min;
      } else {
        availabilities[item.id] = { byDate: {}, available: 0 };
        let sum = 0;
        const date = new Date(StartDate);
        date.setHours(0, 0, 0, 0);
        const dateEnd = new Date(StartDate);
        dateEnd.setHours(23, 59, 59, 999);

        for (const reservation of itemReservations) {
          const loanStart = new Date(reservation.loan.startTime);
          const loanEnd = new Date(reservation.loan.endTime);

          const overlaps = loanStart <= dateEnd && loanEnd >= date;
          const blocksAvailability =
            reservation.status !== 'REJECTED' &&
            reservation.status !== 'RETURNED' &&
            reservation.status !== 'IN_BOX';

          if (overlaps && blocksAvailability) {
            sum += reservation.amount;
          }
        }
        availabilities[item.id].available = amount - sum;
      }
    }),
  );

  return NextResponse.json({ availabilities });
}
