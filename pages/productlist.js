import React from 'react';
import { Stack, Button, SimpleGrid } from '@chakra-ui/react';
import ItemCard from '../components/ItemCard';
import { useSelector } from 'react-redux';
import Link from '../components/Link';
import { useState } from 'react';
import { useEffect } from 'react';

export default function AllItems({ items, categories }) {
    const dates = useSelector((state) => state.dates);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const StartDate = dates.startDate;
    const EndDate = dates.endDate;

    useEffect(() => {
        setLoading(true);
        fetch('/api/availability/getAvailabilities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ StartDate, EndDate }),
        })
            .then((response) => response.json())
            .then((data) => {
                setData(data);
                setLoading(false);
                console.log(data);
            })
            .catch((error) => console.log(error));
    }, []);

    const availabilities = data?.availabilities;

    if (loading) {
        return <div>Ladataan...</div>;
    }

    return (
        <>
            <Stack direction='row' padding='4px'>
                {categories.map((category) => (
                    <Link href={`/category/${category.name}`} key={category.id}>
                        <Button>{category.name}</Button>
                    </Link>
                ))}
            </Stack>

            <SimpleGrid columns={[null, 1, 2, 3, 4]} spacing={10}>
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} availableAmount={availabilities[item.id].available} />
                ))}
            </SimpleGrid>
        </>
    );
}
