import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Session guards for route handlers.
 *
 * Every protected route used to inline `getServerSession` plus its own 401,
 * which drifted into four different bodies for the same condition ('Kirjaudu
 * sisään', 'Ei kirjautunut', 'Ei kirjautunut sisään', 'Unauthorized'). These
 * return one wording per condition, in Finnish like the rest of the UI — the
 * client surfaces `message` in a toast.
 *
 * Usage:
 *
 *   const { session, denied } = await requireAdmin();
 *   if (denied) return denied;
 *   // session is non-null from here on
 *
 * Note these only answer "is this caller allowed to call this route at all".
 * Per-resource checks (does this loan belong to the caller?) stay in the route.
 */
type Guard =
  | { session: Session; denied: null }
  | { session: null; denied: NextResponse };

const allow = (session: Session): Guard => ({ session, denied: null });

const deny = (message: string): Guard => ({
  session: null,
  denied: NextResponse.json({ message }, { status: 401 }),
});

/** Any signed-in user. */
export async function requireUser(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return deny('Kirjaudu sisään');
  return allow(session);
}

/** ADMIN only — including a kiosk session currently elevated to ADMIN. */
export async function requireAdmin(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN') {
    return deny('Sinulla ei ole oikeutta tähän toimintoon');
  }
  return allow(session);
}

/** ADMIN or a kiosk terminal — for the shared-terminal flows. */
export async function requireAdminOrKiosk(): Promise<Guard> {
  const session = await getServerSession(authOptions);
  if (session?.user?.group !== 'ADMIN' && session?.user?.group !== 'KIOSK') {
    return deny('Sinulla ei ole oikeutta tähän toimintoon');
  }
  return allow(session);
}
