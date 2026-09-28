// npm run db:migrate: applies pending migrations to DATABASE_URL.
import { config } from "dotenv";
import { runMigrations } from "../src/server/db/migrate";

// ENV_FILE=.env.production.local targets the live database instead of the local one.
config({ path: process.env.ENV_FILE ?? ".env.local", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

await runMigrations(url);
console.log("Migrations applied.");
