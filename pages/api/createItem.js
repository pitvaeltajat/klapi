import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handle(req, res) {
    console.log('body in API', req.body);
    // destruct location and categories from the body to be used in connect queries
    const {
        ['locationId']: locationIdOrNewName,
        ['categories']: categoriesList,
        ...rest
    } = req.body;
    const item = await prisma.item.create({
        data: {
            ...rest,
            location: {
                connectOrCreate: {
                    where: {
                        id: locationIdOrNewName,
                    },
                    create: {
                        name: locationIdOrNewName,
                    },
                },
            },
            // for each category, check if it exists and connect, if not, create it
            categories: categoriesList.map((categoryIdOrName) => ({
                connectOrCreate: {
                    where: {
                        id: categoryIdOrName,
                    },
                    create: {
                        name: categoryIdOrName,
                    },
                },
            })),
        },
    });
    console.log(item, 'item in API');
    res.status(200).json(item);
}
