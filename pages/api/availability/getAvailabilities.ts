import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	const { StartDate, EndDate } = req.body;

	// Add validation for dates
	if (!StartDate || !EndDate) {
		return res.status(400).json({
			error: 'Missing required dates',
			details: {
				StartDate: StartDate ? 'present' : 'missing',
				EndDate: EndDate ? 'present' : 'missing',
			},
		});
	}

	// Validate that the dates are valid
	const startDate = new Date(StartDate);
	const endDate = new Date(EndDate);

	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
		return res.status(400).json({
			error: 'Invalid date format',
			details: {
				StartDate: isNaN(startDate.getTime()) ? 'invalid' : 'valid',
				EndDate: isNaN(endDate.getTime()) ? 'invalid' : 'valid',
			},
		});
	}

	// Validate that end date is after start date
	if (endDate < startDate) {
		return res.status(400).json({
			error: 'End date must be after start date',
			dates: {
				StartDate,
				EndDate,
			},
		});
	}

	const items = await prisma.item.findMany({});
	const reservations = await prisma.reservation.findMany({
		include: {
			item: true,
			loan: true,
		},
	});

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

				const date1 = new Date(StartDate);
				const date2 = new Date(StartDate);
				const endDate = new Date(EndDate);

				date1.setHours(0, 0, 0, 0);
				date2.setHours(23, 59, 59, 999);
				endDate.setHours(23, 59, 59, 999);
				while (date1 <= endDate) {
					let sum = 0;
					const modReservations = itemReservations.filter((reservation) => {
						reservation.loan.startTime = new Date(reservation.loan.startTime);
						reservation.loan.endTime = new Date(reservation.loan.endTime);
						return (
							reservation.loan.startTime <= date2 &&
							reservation.loan.endTime >= date1 &&
							reservation.loan.status !== 'REJECTED' &&
							reservation.loan.status !== 'RETURNED'
						);
					});
					modReservations.map((reservation) => {
						sum += reservation.amount;
					});
					availabilities[item.id].byDate[date1.toISOString()] = amount - sum;

					if (amount - sum < min) {
						min = amount - sum;
					}

					date1.setDate(date1.getDate() + 1);
					date2.setDate(date2.getDate() + 1);
				}
				availabilities[item.id].available = min;
			} else {
				availabilities[item.id] = { byDate: {}, available: 0 };
				let sum = 0;
				const date = new Date(StartDate);
				const modReservations = itemReservations.filter((reservation) => {
					reservation.loan.startTime = new Date(reservation.loan.startTime);
					reservation.loan.endTime = new Date(reservation.loan.endTime);
					return reservation.loan.startTime <= date && reservation.loan.endTime >= date;
				});
				modReservations.map((reservation) => {
					sum += reservation.amount;
				});
				availabilities[item.id].available = amount - sum;
			}
		})
	);

	res.status(200).json({ availabilities });
}
