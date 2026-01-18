import Auth from './auth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Heading, Flex, Text, VStack } from '@chakra-ui/react';
import type { NextPage } from 'next';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

const Login: NextPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const showLoading = useDelayedLoading(status === 'loading' || !!session);

  if (session) {
    const from = Array.isArray(router.query.from) ? router.query.from[0] : router.query.from;
    router.push((from && decodeURIComponent(from)) || '/');
  }

  if (status === 'loading' || session) {
    if (!showLoading) {
      return null;
    }
    return <LoadingSpinner fullWidth minHeight="100vh" />;
  }

  return (
    <Flex minH="100vh" align="flex-start" justify="center" pt="25vh">
      <Head>
        <title>Kirjaudu sisään | Klapi</title>
      </Head>
      <VStack spacing={4} textAlign="center">
        <Heading>Kirjaudu sisään</Heading>
        <Text>Käyttääksesi Klapia sinun tulee kirjautua palveluun.</Text>
        <Auth />
      </VStack>
    </Flex>
  );
};

export default Login;
