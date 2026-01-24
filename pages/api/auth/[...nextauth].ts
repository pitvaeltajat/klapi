import NextAuth, { DefaultSession, NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '../../../utils/prisma';
import bcrypt from 'bcrypt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      group: 'ADMIN' | 'USER' | 'KIOSK';
    } & DefaultSession['user'];
  }

  interface User {
    group: 'ADMIN' | 'USER' | 'KIOSK';
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    group: 'ADMIN' | 'USER' | 'KIOSK';
    userId?: string;
  }
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
        // If group is KIOSK and login was via CredentialsProvider, set session expiration to one year
        if (session.user.group === 'KIOSK' && token.provider === 'credentials') {
          const oneYearMs = 365 * 24 * 60 * 60 * 1000;
          session.expires = new Date(Date.now() + oneYearMs).toISOString();
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
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

      return token;
    },
  },
  session: {
    strategy: 'jwt',
  },
};

export default NextAuth(authOptions);
