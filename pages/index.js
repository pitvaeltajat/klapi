import React from 'react';
import Auth from './auth';
import prisma from '/utils/prisma';
import { Button } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import Link from '../components/Link';

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
            <Link href='/selectdate'>
                <Button colorScheme='blue'>Lisää uusi varaus</Button>
            </Link>
            <Link href='/newitem'>
                <Button>Luo uusi kama</Button>
            </Link>
        </>
    );
}
