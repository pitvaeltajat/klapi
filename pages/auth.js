import { useSession, signIn, signOut } from 'next-auth/react';
import { Button, ButtonGroup } from '@chakra-ui/react';

export default function Auth() {
    const { data: session } = useSession();
    if (session) {
        return (
            <>
                Kirjautunut sisään sähköpostiosoitteella {session.user.email} <br />
                <Button colorScheme='blue' onClick={() => signOut()}>
                    Kirjaudu ulos
                </Button>
            </>
        );
    }
    return (
        <>
            Ei kirjautunut sisään <br />
            <Button colorScheme='blue' onClick={() => signIn()}>
                Kirjaudu sisään
            </Button>
        </>
    );
}
