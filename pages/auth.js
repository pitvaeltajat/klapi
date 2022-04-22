import { useSession, signIn, signOut } from 'next-auth/react';
import { Button, ButtonGroup } from '@chakra-ui/react';

export default function Auth() {
    const { data: session } = useSession();
    if (session) {
        return (
            <>
                Signed in as {session.user.email} <br />
                <Button colorScheme='blue' onClick={() => signOut()}>Sign out</Button>
            </>
        );
    }
    return (
        <>
            Not signed in <br />
            <Button colorScheme='blue' onClick={() => signIn()}>Sign in</Button>
        </>
    );
}
