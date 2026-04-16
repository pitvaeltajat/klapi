'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import type { FC } from 'react';
import { Button } from '@/components/ui/button';

const Auth: FC = () => {
  const { data: session, status } = useSession();
  if (session) {
    return <Button onClick={() => signOut()}>Kirjaudu ulos</Button>;
  }
  return (
    <Button onClick={() => signIn()} isLoading={status === 'loading'}>
      {status === 'loading' ? 'Kirjaudutaan...' : 'Kirjaudu'}
    </Button>
  );
};

export default Auth;
