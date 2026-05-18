// Augment NextAuth types so session.user.id is recognized in TypeScript.
// NextAuth v5 doesn't include id on session.user by default; we add it in
// the session callback (see lib/auth.ts), and this declaration tells TS.

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
