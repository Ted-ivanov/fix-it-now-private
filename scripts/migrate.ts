// npm run db:migrate: applies pending migrations to DATABASE_URL.
import { config } from "dotenv";
import { runMigrations } from "../src/server/db/migrate";

config({ path: ".env.local", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

await runMigrations(url);
console.log("Migrations applied.");
