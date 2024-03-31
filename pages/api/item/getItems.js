import { getServerSession } from 'next-auth';
import prisma from '/utils/prisma';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions);

	const items = await prisma.item.findMany({
		include: {
			categories: true,
			reservations: { include: { loan: true } },
		},
	});
	if (session) {
		res.status(200).json(items);
	} else {
		res.status(401).json({ message: 'Unauthorized' });
	}
}
