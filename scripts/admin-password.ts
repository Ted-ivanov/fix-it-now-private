// npm run admin:password: sets a new password for an existing admin, optionally changing their email.
//   ADMIN_EMAIL=current@example.com ADMIN_PASSWORD='new long password' [ADMIN_NEW_EMAIL=new@example.com] npm run admin:password
// ENV_FILE=.env.production.local targets the live database instead of the local one.
import { config } from "dotenv";

config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const { db } = await import("../src/server/db");
const { updateAdminLogin } = await import("../src/server/services/admin-users");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const newEmail = process.env.ADMIN_NEW_EMAIL || undefined;
if (!email || !password) {
  console.log("Set ADMIN_EMAIL (the current login) and ADMIN_PASSWORD (the new password).");
  process.exit(1);
}

const updated = await updateAdminLogin(db, { email, password, newEmail });
console.log(
  updated
    ? `Admin ${email} updated${newEmail ? `, now logs in as ${newEmail}` : ""}. All sessions signed out.`
    : `No admin with email ${email}.`,
);
process.exit(updated ? 0 : 1);
