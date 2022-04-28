import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export default async function handle(req, res) {
    // destruct location and categories from the body to be used in connect queries
    const {
        ['locationId']: locationIdOrNewName,
        ['categories']: categoriesList,
        ...rest
    } = req.body;
    // create new array with connectorcreate query for each category
    const categoryJSON = categoriesList?.map((categoryObject) => ({
        where: {
            id: categoryObject.value,
        },
        create: {
            name: categoryObject.value,
        },
    }));
    console.log(categoryJSON);
    const item = await prisma.item.create({
        data: {
            ...rest,
            location: locationIdOrNewName && {
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
            categories: { connectOrCreate: categoryJSON },
        },
    });
    res.status(200).json(item);
}
