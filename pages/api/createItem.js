import prisma from '/utils/prisma';

export default async function handler(req, res) {
    // destruct location and categories from the body to be used in connect queries
    const {
        ['locationId']: locationObject,
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
    const item = await prisma.item.create({
        data: {
            ...rest,
            location: locationObject && {
                connectOrCreate: {
                    where: {
                        id: locationObject.value,
                    },
                    create: {
                        name: locationObject.value,
                    },
                },
            },
            // for each category, check if it exists and connect, if not, create it
            categories: { connectOrCreate: categoryJSON },
        },
    });
    res.status(200).json(item);
}
