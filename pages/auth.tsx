import { useSession, signIn, signOut } from 'next-auth/react';
import { Button } from '@chakra-ui/react';
import type { FC } from 'react';

const Auth: FC = () => {
  const { data: session, status } = useSession();
  if (session) {
    return (
      <>
        <Button colorScheme="blue" onClick={() => signOut()}>
          Kirjaudu ulos
        </Button>
      </>
    );
  }
  return (
    <>
      <Button
        colorScheme="blue"
        onClick={() => signIn()}
        isLoading={status === 'loading'}
        loadingText="Kirjaudutaan..."
      >
        Kirjaudu
      </Button>
    </>
  );
};

export default Auth;
