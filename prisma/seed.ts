import { PrismaClient, Prisma } from '@prisma/client';

// create base data for the app based on schema.prisma

async function main() {
    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
