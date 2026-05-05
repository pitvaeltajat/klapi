'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const showLoading = useDelayedLoading(status === 'loading' || !!session);

  const [username, setUsername] = useState('pitva');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    const from = searchParams.get('from');
    router.push((from && decodeURIComponent(from)) || '/');
  }

  if (status === 'loading' || session) {
    if (!showLoading) return null;
    return <LoadingSpinner fullWidth minHeight="100vh" />;
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
        <div className="flex items-center gap-3 text-xs uppercase text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          tai
          <div className="h-px flex-1 bg-border" />
        </div>
        <Button variant="outline" onClick={() => signIn('google', { callbackUrl })}>
          Jatka Googlella
        </Button>
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
