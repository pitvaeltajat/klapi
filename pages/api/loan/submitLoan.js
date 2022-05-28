import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const { reservations, startTime, endTime, userName, description } =
        req.body;
    try {
        const user_id = await prisma.user.findMany({
            where: { name: { contains: userName } },
            select: { id: true },
        });

        const userId = user_id[0]['id'];

        const result = await prisma.Loan.create({
            data: {
                reservations: { create: reservations },
                startTime: startTime,
                endTime: endTime,
                user: { connect: { id: userId } },
                description,
            },
        });
        res.status(200).json(result);
    } catch (err) {
        res.json({
            err: err.message,
        });
    }
}
