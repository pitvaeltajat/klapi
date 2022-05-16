import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handler(req, res) {
    const locations = await prisma.location.findMany();
    res.json(locations);
}
