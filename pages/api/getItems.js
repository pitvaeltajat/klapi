import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const items = await prisma.item.findMany({include: {
        categories: true,
        reservations: { include: { loan: true } },
    }});
    res.json(items);
}
