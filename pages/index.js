import React from 'react';
import prisma from '/utils/prisma';
import DateSelector from '../components/DateSelector';
import { Heading } from '@chakra-ui/react';
import AllItems from './productlist';
import { useSelector } from 'react-redux';

export async function getServerSideProps() {
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

export default function Index({ items, categories }) {
    const datesSet = useSelector(state => state.dates.datesSet)

    return (
        <>
            <DateSelector />
            {datesSet ? (
                <><Heading>Haku</Heading><AllItems items={items} categories={categories} /></>
            ) : null}
            
        </>
    );
}
