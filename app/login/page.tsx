'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Auth from '@/components/Auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const showLoading = useDelayedLoading(status === 'loading' || !!session);

  if (session) {
    const from = searchParams.get('from');
    router.push((from && decodeURIComponent(from)) || '/');
  }

  if (status === 'loading' || session) {
    if (!showLoading) return null;
    return <LoadingSpinner fullWidth minHeight="100vh" />;
  }

  return (
    <div className="flex min-h-screen items-start justify-center pt-[25vh]">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold">Kirjaudu sisään</h1>
        <p>Käyttääksesi Klapia sinun tulee kirjautua palveluun.</p>
        <Auth />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullWidth minHeight="100vh" />}>
      <LoginContent />
    </Suspense>
  );
}
