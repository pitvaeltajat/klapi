import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/utils/prisma';
import bcrypt from 'bcrypt';

declare module 'next-auth/jwt' {
  interface JWT {
    group: 'ADMIN' | 'USER' | 'KIOSK';
    userId?: string;
    adminExpiry?: string | null;
    elevatedById?: string | null;
    elevatedByName?: string | null;
  }
}

// Kiosk admin elevation lasts 30 minutes. This is enforced server-side in the
// jwt callback below — the browser timer in TopBar is only cosmetic.
const ELEVATION_TTL_MS = 30 * 60 * 1000;

/**
 * True when a token/session claims kiosk elevation that must no longer be
 * honoured: it has no expiry, its expiry has passed, is malformed, or is
 * implausibly far in the future (a sign of a forged/tampered token). Enforced
 * in BOTH the jwt and session callbacks — the session callback is what runs on
 * every getServerSession read, so authorization actually depends on it.
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

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);
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
        // route reading getServerSession sees the reverted privileges.
        if (isElevationInvalid(session.user.elevatedById, session.user.adminExpiry)) {
          session.user.group = 'KIOSK';
          session.user.adminExpiry = null;
          session.user.elevatedById = null;
          session.user.elevatedByName = null;
        }
        // If group is KIOSK and login was via CredentialsProvider, set session expiration to one year
        if (session.user.group === 'KIOSK' && token.provider === 'credentials') {
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          session.expires = new Date(Date.now() + oneYearMs).toISOString();
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
};
