import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { env } from "@/server/env";

// During `next build` there is no secret (see env.ts); the real one is required at runtime.
const buildPlaceholderSecret =
  process.env.NEXT_PHASE === "phase-production-build" ? "build-only-placeholder-secret-not-used-at-runtime" : undefined;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET ?? buildPlaceholderSecret,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    // Staff accounts are created with `npm run db:seed`; nobody can sign up from the website.
    disableSignUp: true,
    minPasswordLength: 12,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,
  },
  rateLimit: { enabled: true, window: 60, max: 20 },
  plugins: [nextCookies()],
});

/** Every admin page and action calls this: the proxy's cookie check is only a fast pre-check. */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  return session;
}
