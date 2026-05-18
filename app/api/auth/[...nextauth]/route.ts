// NextAuth API route handlers
// Mounted at /api/auth/* — handles sign-in, callback, sign-out, session, csrf, etc.

import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
