// npm run db:seed: loads the starting data and creates the first admin user.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='long password' npm run db:seed
import { config } from "dotenv";

// ENV_FILE=.env.production.local targets the live database instead of the local one.
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const { db } = await import("../src/server/db");
const { seed } = await import("../src/server/db/seed-data");
const { createAdminUser } = await import("../src/server/services/admin-users");

const result = await seed(db);
console.log(result.seeded ? "Seeded categories, teams and working hours." : "Data already present, skipped.");

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  const created = await createAdminUser(db, { email, password, name: "Администратор" });
  console.log(created ? `Admin user ${email} created.` : `Admin user ${email} already exists.`);
} else {
  console.log("Set ADMIN_EMAIL and ADMIN_PASSWORD to create the first admin user.");
}

process.exit(0);
