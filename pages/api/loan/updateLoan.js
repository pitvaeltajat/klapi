import prisma from '/utils/prisma';

export default async function handler(req, res) {
    try {
        const { id, reservations, startTime, endTime, description } = req.body;

        const result = await prisma.loan.update({
            where: {
                id: id,
            },
            data: {
                reservations: {
                    deleteMany: {},
                    create: reservations,
                },
                startTime: startTime,
                endTime: endTime,
                description: description,
            },
        });

        res.status(200).json(result);
    } catch (err) {
        res.json({
            err: err.message,
        });
        return;
    }
}
