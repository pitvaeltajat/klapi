import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const loans = await prisma.loan.findMany();
    res.json(loans);
}
