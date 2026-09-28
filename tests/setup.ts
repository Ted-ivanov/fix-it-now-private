import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

// Integration tests run against a separate database (created by docker/postgres-init.sql).
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://fixit:fixit@localhost:5432/fixit_test";
