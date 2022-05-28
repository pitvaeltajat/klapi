import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const locations = await prisma.location.findMany();
    res.json(locations);
}
