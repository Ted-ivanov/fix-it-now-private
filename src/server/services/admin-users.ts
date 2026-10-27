import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
import type { Db } from "@/server/db";
import { account, session, user } from "@/server/db/schema";

/**
 * Public sign-up is disabled, so admins are created from the command line (npm run db:seed).
 * Returns false if a user with that email already exists.
 */
export async function createAdminUser(
  db: Db,
  input: { email: string; password: string; name: string },
): Promise<boolean> {
  if (input.password.length < 12) throw new Error("Admin password must be at least 12 characters");
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (existing) return false;

  const userId = nanoid();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id: userId, email, name: input.name, emailVerified: true });
    await tx.insert(account).values({
      id: nanoid(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(input.password),
    });
  });
  return true;
}

/**
 * Sets a new password for an existing admin and optionally changes their email (npm run admin:password).
 * Signs the admin out everywhere, so an old session can't outlive the old password.
 * Returns false if no admin has that email.
 */
export async function updateAdminLogin(
  db: Db,
  input: { email: string; password: string; newEmail?: string },
): Promise<boolean> {
  if (input.password.length < 12) throw new Error("Admin password must be at least 12 characters");
  const email = input.email.trim().toLowerCase();
  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  if (!existing) return false;

  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx
      .update(account)
      .set({ password: passwordHash, updatedAt: new Date() })
      .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")));
    if (input.newEmail) {
      await tx
        .update(user)
        .set({ email: input.newEmail.trim().toLowerCase(), updatedAt: new Date() })
        .where(eq(user.id, existing.id));
    }
    await tx.delete(session).where(eq(session.userId, existing.id));
  });
  return true;
}
