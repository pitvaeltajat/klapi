import NextAuth, {
  DefaultSession,
  NextAuthOptions,
  DefaultUser,
} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../utils/prisma";

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
  ],
  callbacks: {
    async session({ session, user }) {
      const newSession = session;
      newSession.user.id = user.id;
      newSession.user.group = user.group;
      return newSession;
    },
  },
  session: {
    strategy: "database" as const,
  },
};

export default NextAuth(authOptions);
