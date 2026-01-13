import prisma from '../../../utils/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import 'dotenv/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	try {
		const { reservations, startTime, endTime, userId, description, loaner } = req.body;
		// reservations: [{ itemId, amount, name? }]
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { name: true, email: true },
		});
		if (!user) {
			res.status(404).json({ message: 'Käyttäjää ei löytynyt' });
			return;
		}
		// Ensure referenced items exist; for custom items (client-generated ids)
		// create temporary Item records and replace itemId accordingly.
		const processedReservations: { itemId: string; amount: number }[] = [];
		for (const r of reservations) {
			let itemId = r.itemId as string;
			const existing = await prisma.item.findUnique({ where: { id: itemId } });
			if (!existing) {
				// If client provided a name for the custom item, create it as temporary.
				if (!r.name) {
					res.status(400).json({ message: `Missing name for custom item ${itemId}` });
					return;
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

		const createReservations = processedReservations.map((r) => ({
			amount: r.amount,
			item: { connect: { id: r.itemId } },
		}));

		const result = await prisma.loan.create({
			data: {
				reservations: { create: createReservations },
				startTime: startTime,
				endTime: endTime,
				user: { connect: { id: userId } },
				description,
				loaner,
			},
		});

		await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToUser`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: result.id,
				email: user.email,
			}),
		});

		await fetch(`${process.env.NEXT_PUBLIC_VERCEL_URL}/api/email/sendNewLoanToAdmin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				id: result.id,
				loanCreator: user.name,
			}),
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
