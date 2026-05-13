'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-start justify-center pt-[15vh]">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-6 px-6">
        <div className="space-y-3">
          <Skeleton className="mx-auto h-9 w-2/3" />
          <Skeleton className="mx-auto h-4 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="mx-auto h-8 w-40" />
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const showLoading = useDelayedLoading(status === 'loading' || !!session);

  const [username, setUsername] = useState('pitva');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showKiosk, setShowKiosk] = useState(false);

  if (session) {
    const from = searchParams.get('from');
    router.push((from && decodeURIComponent(from)) || '/');
  }

  if (status === 'loading' || session) {
    if (!showLoading) return null;
    return <LoginSkeleton />;
  }

  const callbackUrl = decodeURIComponent(searchParams.get('from') || '') || '/';

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });
    setSubmitting(false);
    if (res?.error) {
      toast.error('Virheellinen käyttäjätunnus tai salasana');
      return;
    }
    if (res?.ok) {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center pt-[15vh]">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-6 px-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Kirjaudu sisään</h1>
          <p className="text-sm text-muted-foreground">
            Käyttääksesi Klapia sinun tulee kirjautua palveluun.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => signIn('google', { callbackUrl })}
          className="gap-3"
        >
          <GoogleLogo />
          Jatka Googlella
        </Button>
        {showKiosk ? (
          <form onSubmit={handleCredentials} className="flex flex-col gap-4 text-left">
            <Field label="Käyttäjätunnus" htmlFor="username">
              <Input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Salasana" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            <Button type="submit" isLoading={submitting}>
              Kirjaudu
            </Button>
          </form>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowKiosk(true)}
            className="text-muted-foreground"
          >
            Kirjaudu kioskitilillä
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}
