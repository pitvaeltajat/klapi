import React from 'react';
import { Container, Heading } from '@chakra-ui/react';
import Auth from './auth';
import NewItem from './newitem';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getServerSideProps(context) {
    const items = await prisma.item.findMany();
    return {
        props: { items },
    };
}

export default function Index({ items }) {
    return (
        <Container>
            <Auth />
            <Heading>Kalusto App nimi pitäisi keksiä</Heading>
            <NewItem />
            <ul>
                {items.map((item) => (
                    <li key={items.id}>{items.name}</li>
                ))}
            </ul>
        </Container>
    );
}
