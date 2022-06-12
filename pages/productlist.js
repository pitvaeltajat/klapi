import React from 'react';
import { Stack, Button, SimpleGrid } from '@chakra-ui/react';
import ItemCard from '../components/ItemCard';
import { useSelector } from 'react-redux';
import Link from '../components/Link';

export default function AllItems({ items, categories }) {
    const dates = useSelector((state) => state.dates);

    return (
        <>
            <h1>Kaikki kamat</h1>
            <Stack direction='row' padding='4px'>
                {categories.map((category) => (
                    <Link href={`/category/${category.name}`} key={category.id}>
                        <Button>{category.name}</Button>
                    </Link>
                ))}
            </Stack>
            <h2>Valitut päivämäärät:</h2>
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
            <SimpleGrid columns={[null, 1, 2, 3, 4]} spacing={10}>
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </SimpleGrid>
        </>
    );
}
