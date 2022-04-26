import React from 'react';
import { Container, Heading } from '@chakra-ui/react';
import Auth from './auth';
import NewItem from './newitem';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export async function getServerSideProps(context) {
    const items = await prisma.item.findMany();
    return {
        props: {
            items,
        },
    };
}

export default function Index({ items }) {
    return (
        <Container>
            <Auth />
            <Heading>Kalusto App nimi pitäisi keksiä</Heading>
            <Link href='/newitem'>
                <a>Luo uusi kama</a>
            </Link>
            <ul>
                {items.map((item) => (
                    <li key={item.id}>{item.name}</li>
                ))}
            </ul>
        </Container>
    );
}
