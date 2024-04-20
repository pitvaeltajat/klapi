import { LoanStatus, PrismaClient } from '@prisma/client';
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

	const { id } = req.body;
	const result = await prisma.Loan.update({
		where: { id: id },
		data: {
			status: LoanStatus.INUSE,
		},
	});
	res.status(200).json(result);
}
