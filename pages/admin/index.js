import Link from '../../components/Link';
import { Button, Heading } from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import NotAuthenticated from '../../components/NotAuthenticated';

export default function Admin() {
    const { data: session } = useSession();

    if (session?.user?.group !== 'ADMIN') {
        return <NotAuthenticated />;
    }

    async function userEmail() {
        fetch('/api/email/sendNewLoanToUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: session?.user?.email,
                id: '69',
            }),
        });
    }
    async function adminEmail() {
        fetch('/api/email/sendNewLoanToAdmin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: '69',
                loanCreator: session?.user?.name,
            }),
        });
    }

    async function acceptedEmail() {
        fetch('/api/email/sendApproved', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: '69',
                email: session?.user?.email,
            }),
        });
    }



    return (
        <>
            <Heading>Super upea admin näkymä</Heading>
            <Link href='/admin/createItem'>
                <Button>Luo uusi kama</Button>
            </Link>
            <Link href='/admin/manageUsers'>
                <Button>Hallitse käyttäjiä</Button>
            </Link>
            <Button onClick={() => userEmail()}>Usermail</Button>
            <Button onClick={() => adminEmail()}>Adminmail</Button>
            <Button onClick={() => acceptedEmail()}>Acceptedmail</Button>
        </>
    );
}
