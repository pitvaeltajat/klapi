import Auth from './auth';
import Head from 'next/head';
import Router from 'next/router';
import { useSession } from 'next-auth/react';
import { Heading } from '@chakra-ui/react';
import type { NextPage } from 'next';

const Login: NextPage = () => {
  const { data: session } = useSession();

  if (session) {
    const from = Array.isArray(Router.query.from) ? Router.query.from[0] : Router.query.from;
    Router.push((from && decodeURIComponent(from)) || '/');
  }

  return (
    <>
      <Head>
        <title>Kirjaudu sisään | Klapi</title>
      </Head>
      <Heading>Kirjaudu sisään</Heading>
      <p>Käyttääksesi Klapia sinun tulee kirjautua palveluun.</p>
      <br />
      <Auth />
    </>
  );
};

export default Login;
