import React from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import Auth from './auth';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import ItemCard from '../components/ItemCard';

const prisma = new PrismaClient();

export async function getServerSideProps() {
    const items = await prisma.item.findMany();
    return {
        props: {
            items,
        },
    };
}

export default function Index({ items }) {
    return (
        <>
            <Auth />
            <h1>Hello World</h1>
            {users.map((user) => (
                <p key={user.id}>{user.name}</p>
            ))}
            <NextLink href='/selectdate'>
                <Button colorScheme='blue' >Lisää uusi varaus</Button>
            </NextLink>
        </div>
    );
};

            <br />
            <SimpleGrid columns={3} spacing={10}>
                {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                ))}
            </SimpleGrid>

            <NextLink href='/productlist'>
                <Button colorScheme='blue'>Lisää uusi varaus</Button>
            </NextLink>
            <Link href='/newitem'>
                <Button>Luo uusi kama</Button>
            </Link>
        </>
    );
}
