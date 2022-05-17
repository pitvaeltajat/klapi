import Auth from './auth';
import { Heading } from '@chakra-ui/react';
import { useSession, getSession } from 'next-auth/react';
import prisma from '/utils/prisma';

export async function getServerSideProps() {
    const session = await getSession();

    const loans = await prisma.loan.findMany({
        where: {
            user: {
                id: session?.user?.id,
            },
        },
    });
    return {
        props: {
            loans,
        },
    };
}

export default function Account({ loans }) {
    const { data: session, status } = useSession();
    if (session) {
        return (
            <>
                <Heading>{session?.user?.name}</Heading>
                <Heading>{session?.user?.email}</Heading>
                <Heading size='md'>Omat varaukset</Heading>
                {loans.map((loan) => (
                    <>
                        <p>{loan.description || loan.id}</p>
                    </>
                ))}
                <Auth />
            </>
        );
    } else {
        return (
            <>
                <Heading>Ei kirjautunut sisään</Heading>
                <Auth />
            </>
        );
    }
}
