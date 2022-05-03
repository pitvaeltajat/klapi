import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handle(req, res) {
    const items = await prisma.item.createMany({
        data: req.data,
    });
    res.json(items);
}
