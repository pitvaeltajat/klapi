import React from 'react';
import Auth from './auth';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { Button } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useSession } from 'next-auth/react';

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
    const { data: session, status } = useSession();

    return (
        <>
            <Auth />
            <br />
            <NextLink href='/selectdate'>
                <Button colorScheme='blue'>Lisää uusi varaus</Button>
            </NextLink>
            <Link href='/newitem'>
                <Button>Luo uusi kama</Button>
            </Link>
        </>
    );
}
