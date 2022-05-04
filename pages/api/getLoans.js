import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handle(req, res) {
    const loans = await prisma.loan.findMany();
    res.json(loans);
}
