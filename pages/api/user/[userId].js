import prisma from '/utils/prisma';

export default async function handler(req, res) {
    const { userId } = req.query;
    if (req.method == 'GET') {
        // get the user from the database
        await prisma.user
            .findOne({
                where: {
                    id: userId,
                },
            })
            .then((user) => {
                res.json(user);
            })
            .catch((err) => {
                res.json(err);
            });
    } else if (req.method == 'PUT') {
        // update or create the user in the database
        await prisma.user
            .update({
                where: {
                    id: userId,
                },
                data: {
                    name: req.body.name,
                    email: req.body.email,
                    password: req.body.password,
                    role: req.body.role,
                },
            })
            .then((user) => {
                res.status(200).json(user);
            })
            .catch((err) => {
                res.status(500).json(err);
            });
    } else if (req.method == 'PATCH') {
        // update the user in the database
        await prisma.user
            .update({
                where: {
                    id: userId,
                },
                data: {
                    group: req.body.group,
                },
            })
            .then((user) => {
                res.status(200).json(user);
            })
            .catch((err) => {
                res.status(500).json(err);
            });
    } else if (req.method == 'DELETE') {
        // delete the user from the database
        await prisma.user
            .delete({
                where: {
                    id: userId,
                },
            })
            .then((user) => {
                res.json(user);
            })
            .catch((err) => {
                res.json(err);
            });
    } else {
        res.status(405).json({
            message: 'Method not allowed',
        });
    }
}
