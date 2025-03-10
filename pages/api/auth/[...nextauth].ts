import NextAuth, { DefaultSession, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../utils/prisma";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      group: "ADMIN" | "USER";
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID ?? "",
      clientSecret: process.env.GOOGLE_SECRET ?? "",
    }),
  ],
  callbacks: {
    async session({ session, user }: any) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          group: user.group,
        },
      };
    },
  },
  session: {
    strategy: "database" as const,
  },
};

export default NextAuth(authOptions);
