'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { DEV_LOGIN_ACCOUNTS, DEV_LOGIN_PROVIDER_ID } from '@/utils/devLogin';
import { Skeleton } from '@/components/ui/skeleton';
import { PitvaLogo } from '@/components/PitvaLogo';
import { useDelayedLoading } from '@/hooks/useDelayedLoading';
import {
  SILENT_ATTEMPT_KEY,
  SILENT_AUTH_PARAMS,
  loginErrorMessage,
  nextStepAfterLoginError,
} from '@/utils/loginHelpers';

/**
 * Remember that a silent sign-in is in flight, and report whether we managed
 * to. A browser that refuses `sessionStorage` (private mode, cookies blocked)
 * would leave us unable to tell a bounced silent attempt from a real failure on
 * the way back — and a silent attempt we cannot recover from is a dead end, so
 * in that case we simply never make one.
 */
function markSilentAttempt(): boolean {
  try {
    sessionStorage.setItem(SILENT_ATTEMPT_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

/** Read the flag and clear it — a mark is only ever good for one trip. */
function takeSilentAttempt(): boolean {
  try {
    const marked = sessionStorage.getItem(SILENT_ATTEMPT_KEY) === '1';
    sessionStorage.removeItem(SILENT_ATTEMPT_KEY);
    return marked;
  } catch {
    return false;
  }
}

/**
 * Local development only — the server decides whether this is rendered at all
 * (`utils/devLogin.ts`). Pick an account and you are it, no password. The three
 * buttons are the seeded accounts, one per role; the field takes any other
 * username or email.
 */
function DevLoginPanel({
  currentUser,
  onSignedIn,
}: {
  currentUser?: string | null;
  onSignedIn: () => void;
}) {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const enter = async (username: string) => {
    if (!username.trim()) return;
    setBusy(username);
    const res = await signIn(DEV_LOGIN_PROVIDER_ID, { username, redirect: false });
    setBusy(null);
    if (res?.error || !res?.ok) {
      toast.error(`Tuntematon tunnus: ${username}`);
      return;
    }
    onSignedIn();
  };

  return (
    <Card variant="muted" padding="md" className="text-left">
      <Alert variant="warning" title="Kehityskirjautuminen" className="mb-3">
        Vain paikallisesti. Kirjaa sisään ilman salasanaa.
        {currentUser && <div className="mt-1">Kirjautuneena: {currentUser}</div>}
      </Alert>
      <div className="flex flex-wrap gap-2">
        {DEV_LOGIN_ACCOUNTS.map((account) => (
          <Button
            key={account.username}
            size="sm"
            variant="secondary"
            isLoading={busy === account.username}
            onClick={() => enter(account.username)}
          >
            {account.label}
          </Button>
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void enter(identifier);
        }}
      >
        <Input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="Muu tunnus tai sähköposti"
          aria-label="Kehityskirjautumisen tunnus"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!identifier.trim()}>
          Kirjaudu
        </Button>
      </form>
    </Card>
  );
}

export function LoginSkeleton() {
  return (
    <div className="flex min-h-screen items-start justify-center pt-[15vh]">
      <div className="flex w-full max-w-sm flex-col items-stretch gap-6 px-6">
        <div className="space-y-3">
          {/* Stands in for the emblem, so the page does not jump by its height
              when the real content replaces this. */}
          <Skeleton className="mx-auto mb-4 h-28 w-28 rounded-full" />
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

export default function LoginContent({ devLoginEnabled }: { devLoginEnabled: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Auth.js sends a failed sign-in back here as `?error=`. Both outcomes below
  // navigate, so the page stays a skeleton for as long as the parameter is
  // there rather than flashing the form up in between.
  const error = searchParams.get('error');

  const showLoading = useDelayedLoading(status === 'loading' || !!session || !!error);

  const [username, setUsername] = useState('pitva');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showKiosk, setShowKiosk] = useState(false);

  // Redirecting *during render* threw `ReferenceError: location is not defined`
  // on the server (router.push reaches for `location` there) and made React warn
  // about updating Router while rendering LoginContent. An effect runs after
  // paint, on the client only, which is where a redirect belongs.
  const from = searchParams.get('from');
  const callbackUrl = (from && decodeURIComponent(from)) || '/';
  useEffect(() => {
    // Not while the dev panel is up: /login is then the account switcher, and
    // bouncing an already-signed-in visitor home would mean signing out first
    // every time you wanted to look at the app as somebody else.
    if (session && !devLoginEnabled) router.push(callbackUrl);
  }, [session, callbackUrl, router, devLoginEnabled]);

  // If it was our silent attempt that bounced, Google is only saying it needs
  // the user — go straight back out the ordinary way, so the visitor's single
  // click still lands them signed in. Anything else is a real failure: say so,
  // and drop the skeleton for the form.
  useEffect(() => {
    if (!error) return;
    if (nextStepAfterLoginError(takeSilentAttempt()) === 'retry-interactive') {
      void signIn('google', { callbackUrl });
      return;
    }
    toast.error(loginErrorMessage(error));
    // Drop the code from the URL rather than tracking "handled" in state: it
    // renders the form, and a refresh then can't re-announce a failure the
    // reader has already seen. `from` has to survive — it is where they were
    // headed before they were sent here to log in.
    router.replace(from ? `/login?from=${from}` : '/login');
  }, [error, callbackUrl, from, router]);

  if (status === 'loading' || (session && !devLoginEnabled) || error) {
    if (!showLoading) return null;
    return <LoginSkeleton />;
  }

  /**
   * Ask Google to complete the sign-in without showing anything. It answers
   * with an error whenever that is impossible — signed out, never consented,
   * or two accounts in the domain to choose between — and the effect above
   * turns that into the ordinary flow.
   */
  const handleGoogle = () => {
    const silent = markSilentAttempt();
    void signIn('google', { callbackUrl }, silent ? { ...SILENT_AUTH_PARAMS } : undefined);
  };

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
          {/* text-foreground, not text-header: --header is the same navy in both
              themes because the app bar never follows the theme, and on the dark
              login background that navy would be all but invisible. --foreground
              is that navy in light mode and pale in dark, which is what a
              single-colour line drawing needs. */}
          <PitvaLogo
            title="Pitkäjärven Vaeltajat ry"
            className="mx-auto mb-4 h-28 w-28 text-foreground"
          />
          <h1 className="text-3xl font-semibold">Kirjaudu sisään</h1>
          <p className="text-sm text-muted-foreground">
            Käyttääksesi Klapia sinun tulee kirjautua palveluun.
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={handleGoogle}
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
        {devLoginEnabled && (
          <DevLoginPanel
            currentUser={session?.user?.name || session?.user?.email}
            onSignedIn={() => router.push(callbackUrl)}
          />
        )}
      </div>
    </div>
  );
}

