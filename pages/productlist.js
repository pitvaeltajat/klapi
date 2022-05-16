import React from 'react';
import { Stack, Button, SimpleGrid } from '@chakra-ui/react';
import { PrismaClient } from '@prisma/client';
import NextLink from 'next/link';
import ItemCard from '../components/itemcard';
import { useSelector } from 'react-redux';

export async function getStaticProps() {
    const prisma = new PrismaClient();
    const items = await prisma.Item.findMany({
        include: {
            categories: true,
            reservations: { include: { loan: true } },
        },
        orderBy: { name: 'asc' },
    });
    const categories = await prisma.Category.findMany({
        orderBy: { name: 'asc' },
    });
    return { props: { items, categories } };
}

export default function AllItems({ items, categories }) {
    const dates = useSelector((state) => state.dates);

    return (
        <div>
            <h1>Kaikki kamat</h1>
            <Stack direction='row' padding='4px'>
                {categories.map((category) => (
                    <NextLink href={`/category/${category.name}`}>
                        <Button>{category.name}</Button>
                    </NextLink>
                ))}
            </Stack>

            <h2>Päivämäärät:</h2>
            <p>
                {dates.startDate.toLocaleString('fi', {
                    day: 'numeric',
                    year: 'numeric',
                    month: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                })}
            </p>
            <p>
                {dates.endDate.toLocaleString('fi', {
                    day: 'numeric',
                    year: 'numeric',
                    month: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                })}
            </p>

            <SimpleGrid columns={3} spacing={10}>
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </SimpleGrid>
        </div>
    );
}
