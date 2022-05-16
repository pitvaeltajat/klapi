import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const categories = await prisma.category.findMany();
    res.json(categories);
}
