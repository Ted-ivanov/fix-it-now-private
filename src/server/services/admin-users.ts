import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { nanoid } from "nanoid";
import type { Db } from "@/server/db";
import { account, user } from "@/server/db/schema";

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
