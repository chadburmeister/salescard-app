// NextAuth v5 (beta) configuration with LinkedIn OAuth.
// Requires env vars:
//   AUTH_SECRET            — generated with `openssl rand -base64 32`
//   AUTH_LINKEDIN_ID       — Client ID from linkedin.com/developers
//   AUTH_LINKEDIN_SECRET   — Client Secret from linkedin.com/developers

import NextAuth from "next-auth";
import LinkedIn from "next-auth/providers/linkedin";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // Required for custom production domains (app.salescard.ai) so NextAuth
  // accepts the incoming host header instead of refusing to start.
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [
    LinkedIn({
      clientId: process.env.AUTH_LINKEDIN_ID,
      clientSecret: process.env.AUTH_LINKEDIN_SECRET,
      // LinkedIn's "Sign In with LinkedIn using OpenID Connect" scopes
      authorization: {
        params: { scope: "openid profile email" },
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
