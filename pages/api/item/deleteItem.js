import prisma from '/utils/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req, res) {
	const session = await getServerSession(req, res, authOptions);
	if (session?.user?.group !== 'ADMIN') {
		res.status(401).json({
			message: 'Sinulla ei ole oikeutta tähän toimintoon',
		});
		return;
	}

	// delete the item from the database
	await prisma.item.delete({
		where: {
			id: req.body,
		},
	});
	res.status(200).json({
		message: 'Item deleted',
	});
}
