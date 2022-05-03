import React from 'react';
import { Container, Heading } from '@chakra-ui/react';
import Auth from './auth';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@chakra-ui/react';
import NextLink from 'next/link';

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
            <Link href='/newitem'>
                <a>Luo uusi kama</a>
            </Link>
            <br />
            {items.map((item) => (
                <>
                    <Link href={`/item/${item.id}`}>
                        <a>{item.name}</a>
                    </Link>
                    <br />
                </>
            ))}
            <NextLink href='/productlist'>
                <Button colorScheme='blue'>Lisää uusi varaus</Button>
            </NextLink>
        </>
    );
}
