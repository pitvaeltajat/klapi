import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handle(req, res) {
    const item = await prisma.item.create({
        data: req.data,
    });
    res.json(item);
}
