import { runMigrations } from "../src/server/db/migrate";

// Brings the test database schema up to date once before the whole run.
export default async function setup() {
  await runMigrations(
    process.env.TEST_DATABASE_URL ?? "postgres://fixit:fixit@localhost:5432/fixit_test",
  );
}
