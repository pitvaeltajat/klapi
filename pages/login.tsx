import Auth from './auth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
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
    if (!showLoading) return null;
    return <LoadingSpinner fullWidth minHeight="100vh" />;
  }

  return (
    <div className="flex min-h-screen items-start justify-center pt-[25vh]">
      <Head>
        <title>Kirjaudu sisään | Klapi</title>
      </Head>
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Kirjaudu sisään</h1>
        <p>Käyttääksesi Klapia sinun tulee kirjautua palveluun.</p>
        <Auth />
      </div>
    </div>
  );
};

export default Login;
