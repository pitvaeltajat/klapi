import NextAuth, {
  DefaultSession,
  NextAuthOptions,
  DefaultUser,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../utils/prisma";
import bcrypt from "bcrypt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      group: "ADMIN" | "USER" | "KIOSK";
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    group: "ADMIN" | "USER" | "KIOSK";
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username }
        });

        if (!user || !user.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          group: user.group,
        };
      }
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      const newSession = session;
      if (user) {
        newSession.user.id = user.id;
        newSession.user.group = user.group;
      } else if (token) {
        newSession.user.id = token.sub as string;
        newSession.user.group = token.group as "ADMIN" | "USER" | "KIOSK";
      }
      return newSession;
    },
    async jwt({ token, user }) {
      if (user) {
        token.group = user.group;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt" as const,
  },
};

export default NextAuth(authOptions);
