import NextAuth, { type NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';

// Augmented on `@auth/core/jwt`, not `next-auth/jwt`. The latter is a bare
// `export * from '@auth/core/jwt'` re-export, and TypeScript refuses to augment
// it ("Invalid module name in augmentation") — the interface has to be widened
// where it is declared. That is the only reason `@auth/core` is a direct
// devDependency; nothing imports it at runtime, and it is pinned to the exact
// version next-auth itself depends on.
declare module '@auth/core/jwt' {
  interface JWT {
    group: 'ADMIN' | 'USER' | 'KIOSK';
    userId?: string;
    adminExpiry?: string | null;
    elevatedById?: string | null;
    elevatedByName?: string | null;
    /** Which provider minted this token — the kiosk's year-long session hangs off it. */
    provider?: string;
  }
}

/**
 * The troop's Google Workspace domain, shared with the nightly directory sync.
 * Sent to Google as the `hd` (hosted domain) hint on sign-in — see the provider
 * below. Unset (local dev, a fork) simply means no hint.
 */
const WORKSPACE_DOMAIN = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim() || undefined;

// Kiosk admin elevation lasts 30 minutes. This is enforced server-side in the
// jwt callback below — the browser timer in TopBar is only cosmetic.
const ELEVATION_TTL_MS = 30 * 60 * 1000;

/**
 * True when a token/session claims kiosk elevation that must no longer be
 * honoured: it has no expiry, its expiry has passed, is malformed, or is
 * implausibly far in the future (a sign of a forged/tampered token). Enforced
 * in BOTH the jwt and session callbacks — the session callback is what runs on
 * every `auth()` read, so authorization actually depends on it.
 */
function isElevationInvalid(elevatedById: unknown, adminExpiry: unknown): boolean {
  if (!elevatedById) return false; // not elevated — nothing to invalidate
  if (typeof adminExpiry !== 'string') return true; // elevated with no expiry
  const expiresAt = Date.parse(adminExpiry);
  return (
    !Number.isFinite(expiresAt) ||
    Date.now() >= expiresAt ||
    expiresAt > Date.now() + ELEVATION_TTL_MS + 60_000 // 1-min clock skew
  );
}

/**
 * Verifies a kiosk-elevation PIN entirely server-side and returns the elevated
 * admin, or null. Elevation is **name-scoped**: the caller names which admin
 * they are (`adminId`) and the PIN is checked against *that admin only*. This
 * means a mistyped PIN can never silently elevate as a different admin, and two
 * admins sharing a PIN is harmless. The base session must belong to a KIOSK
 * user — a regular USER can never elevate.
 */
async function verifyElevationPin(
  pin: unknown,
  userId: unknown,
  adminId: unknown,
): Promise<{ id: string; name: string | null } | null> {
  if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return null;
  if (typeof userId !== 'string' || typeof adminId !== 'string') return null;

  const base = await prisma.user.findUnique({
    where: { id: userId },
    select: { group: true },
  });
  if (base?.group !== 'KIOSK') return null;

  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { id: true, name: true, group: true, kioskElevatePin: true },
  });
  if (!admin || admin.group !== 'ADMIN' || !admin.kioskElevatePin) return null;
  if (!(await bcrypt.compare(pin, admin.kioskElevatePin))) return null;

  return { id: admin.id, name: admin.name };
}

/**
 * The Auth.js (next-auth v5) config. Exported on its own so tests can read the
 * provider setup without standing up the handlers; everything the app uses —
 * `auth`, `handlers`, `signIn`, `signOut` — comes out of `NextAuth()` below.
 */
export const authConfig: NextAuthConfig = {
  // v5 would pick `AUTH_SECRET` up by itself and falls back to
  // `NEXTAUTH_SECRET`; naming it keeps the deployed variable authoritative.
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      // `hd` names the account the visitor almost certainly means: their
      // `@$GOOGLE_WORKSPACE_DOMAIN` one. Google then filters its chooser to that
      // domain, and a member signed into both the troop account and a personal
      // Gmail — most of them — is sent straight through with no chooser at all,
      // instead of picking from a list every single time.
      //
      // It is a hint, not a fence: Google documents `hd` as a sign-in UI
      // optimisation and still returns a personal Gmail to anyone who picks
      // "use another account", which is what keeps the pre-Workspace logins
      // (`scripts/merge-users.ts`) reachable. Nothing here authorises on it —
      // Klapi authorises on the `User` row — so the id token's `hd` claim never
      // has to be checked.
      //
      // `hd` on its own does NOT skip the chooser: Google renders it even when
      // exactly one account matches, so this only shortens the list. The
      // parameter that removes the tap is `prompt=none`, sent per-click from
      // `/login` — see `utils/loginHelpers.ts`. Nothing here may set `prompt`,
      // or that per-click value would have nothing to override.
      // Auth.js merges these params over the provider defaults, so `scope`
      // survives.
      ...(WORKSPACE_DOMAIN ? { authorization: { params: { hd: WORKSPACE_DOMAIN } } } : {}),
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // v5 types the credentials bag as `unknown` per field — it is raw form
        // input and the framework does no validation — so narrow before use.
        const { username, password } = credentials ?? {};
        if (typeof username !== 'string' || typeof password !== 'string') {
          return null;
        }
        if (!username || !password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.password || user.deletedAt) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        const now = new Date();
        const isPasswordExpired = user.passwordExpiresAt && user.passwordExpiresAt < now;

        if (!isValidPassword || isPasswordExpired) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          group: user.group,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // Block Google sign-in for a soft-deleted account (its email slot is
        // still occupied, so we'd match the deleted row rather than re-create).
        if (existingUser?.deletedAt) {
          return false;
        }

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              group: 'USER',
            },
          });
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.group = token.group || 'USER';
        session.user.adminExpiry = token.adminExpiry || null;
        session.user.elevatedById = token.elevatedById || null;
        session.user.elevatedByName = token.elevatedByName || null;
        // Lapsed/forged elevation is presented as a plain KIOSK session, so every
        // route reading `auth()` sees the reverted privileges.
        if (isElevationInvalid(session.user.elevatedById, session.user.adminExpiry)) {
          session.user.group = 'KIOSK';
          session.user.adminExpiry = null;
          session.user.elevatedById = null;
          session.user.elevatedByName = null;
        }
        // If group is KIOSK and login was via Credentials, set session expiration to one year
        if (session.user.group === 'KIOSK' && token.provider === 'credentials') {
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          // v5 types this callback's `session` as the *intersection* of the
          // database-strategy and jwt-strategy shapes, which leaves `expires`
          // as `Date & string` — a type no value can satisfy. We only ever run
          // the jwt strategy, where it is the ISO string it has always been.
          const jwtSession = session as unknown as { expires: string };
          jwtSession.expires = new Date(Date.now() + oneYearMs).toISOString();
        }
      }
      return session;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (user) {
        token.group = user.group;
        token.userId = user.id;
      }
      // Store provider in token for session expiration logic
      if (account?.provider) {
        token.provider = account.provider;
      }

      if (account?.provider === 'google' && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
        });
        if (dbUser) {
          token.group = dbUser.group;
          token.userId = dbUser.id;
        } else {
          token.group = 'USER';
        }
      }

      // Kiosk PIN elevation. The client may only REQUEST an action; the server
      // is the sole authority. The PIN is verified here and the elevated
      // identity comes from the matched admin — client-supplied `group`,
      // `elevatedById`, `elevatedByName`, `adminExpiry` are never trusted.
      const req = session as
        | { action?: 'elevate' | 'deElevate'; pin?: string; adminId?: string }
        | null
        | undefined;
      if (trigger === 'update' && req?.action === 'elevate') {
        const admin = await verifyElevationPin(req.pin, token.userId, req.adminId);
        if (admin) {
          token.group = 'ADMIN';
          token.elevatedById = admin.id;
          token.elevatedByName = admin.name;
          token.adminExpiry = new Date(Date.now() + ELEVATION_TTL_MS).toISOString();
        }
        // Invalid PIN or non-kiosk base: leave the token untouched (stays KIOSK).
      } else if (trigger === 'update' && req?.action === 'deElevate') {
        if (token.elevatedById) {
          token.group = 'KIOSK';
          token.elevatedById = null;
          token.elevatedByName = null;
          token.adminExpiry = null;
        }
      }

      // Persist the revert into the token itself when it lapses/looks forged.
      // (The session callback also enforces this on every read; doing it here
      // keeps the stored token clean whenever the jwt callback runs.)
      if (isElevationInvalid(token.elevatedById, token.adminExpiry)) {
        token.group = 'KIOSK';
        token.elevatedById = null;
        token.elevatedByName = null;
        token.adminExpiry = null;
      }

      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
  pages: {
    // Send every sign-in failure to our own page instead of Auth.js's built-in
    // English one. `/login` is where the Finnish wording lives, and — the
    // reason this exists — where a bounced silent attempt is turned back into
    // an ordinary sign-in. A failed OAuth callback is a `signIn`-kind error, a
    // rejected account (`AccessDenied`, a soft-deleted user) an `error`-kind
    // one, so both keys have to point here.
    signIn: '/login',
    error: '/login',
  },
};

/**
 * v5 hands back the handlers and the server-side session reader together.
 * `auth()` is what replaced `getServerSession(authOptions)` — it reads the
 * request from `next/headers` itself, so callers pass nothing. `signIn` /
 * `signOut` are the *server* actions; components keep importing the client
 * versions from `next-auth/react`.
 */
export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
