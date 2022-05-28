import prisma from '/utils/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(req, res) {
    const session = await getSession({ req });
    const { userId } = req.query;
    if (req.method == 'GET') {
        // get the user from the database
        // allow only admins to do this, or the user himself
        if (session?.user?.group === 'ADMIN' || session?.user?.id === userId) {
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
        } else {
            res.status(401).json({
                message: 'Sinulla ei ole oikeutta tähän toimintoon',
            });
        }
    } else if (req.method == 'PUT') {
        if (session?.user?.group !== 'ADMIN') {
            res.code(401).json({
                message: 'Sinulla ei ole oikeutta tähän toimintoon',
            });
        }
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
        // probably in the future need to allow for current user, if they want to change their own details
        // changing group should be allowed only for admin
        if (session?.user?.group !== 'ADMIN') {
            res.code(401).json({
                message: 'Sinulla ei ole oikeutta tähän toimintoon',
            });
        }
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
        if (session?.user?.group !== 'ADMIN') {
            res.code(401).json({
                message: 'Sinulla ei ole oikeutta tähän toimintoon',
            });
        }
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
