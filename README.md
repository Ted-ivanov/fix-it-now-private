# Fix It Now

Website for a small home-repairs company. Bulgarian by default (`/`), English at `/en`.

- **Public site:** four service categories. Each offers an **Inspection & Quote** or a **Repair visit**; the repair visit shows an extra-charge notice first. Customers then pick a date and time from real team availability and send their contact details, optionally with photos. After booking they get a confirmation email with a cancel link. A "Completed work" section shows photo galleries.
- **Admin (`/admin`, Bulgarian):**
  - Upload site photos into a new or existing gallery.
  - See bookings per team and day.
  - Manage teams, working hours and time off.
  - Set visit lengths per service and the travel buffer between jobs.
- **Four front-end designs** use the same backend: the main one at `/`, plus `/v2`, `/v3` and `/v4` for comparison (see below).

## Stack

| Area | Choice |
| --- | --- |
| App | Next.js 16 (App Router, server actions), TypeScript, React 19 |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Better Auth (email + password, sign-up disabled) |
| UI | Tailwind CSS v4, shadcn/ui (Radix), lucide icons, Onest font (Cyrillic + Latin) |
| i18n | next-intl, translated URLs (`/uslugi/elektro` ↔ `/en/services/electrical`) |
| Images | sharp (resize to WebP, strip EXIF/GPS), S3-compatible storage: Cloudflare R2 in production, SeaweedFS locally |
| Email | Resend + React Email (printed to the terminal when no key is set) |
| Spam | Cloudflare Turnstile + Postgres-backed rate limiting + honeypot field |
| Tests | Vitest (unit + integration against Postgres), Playwright (end-to-end, desktop and mobile) |

## Local setup

Requirements: Node 24 and Docker Desktop.

```bash
npm install
cp .env.example .env.local        # then set BETTER_AUTH_SECRET (npx @better-auth/cli secret)
docker compose up -d              # Postgres + SeaweedFS (S3)

# Migrations, storage buckets, starting data and the first admin user:
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a long password' npm run setup

npm run dev                       # http://localhost:3000, admin at /admin
```

On Windows PowerShell set the variables first: `$env:ADMIN_EMAIL='…'; $env:ADMIN_PASSWORD='…'; npm run setup`.

The seed adds these, all changeable in the admin:
- The 4 categories.
- Visit durations: 60 min for an inspection; 90–180 min for a repair, depending on the service.
- A 30-minute travel buffer.
- Two sample teams.
- Company hours: Mon–Fri 08:00–18:00, Sat 09:00–14:00.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm test` | Unit and integration tests (uses the `fixit_test` database) |
| `npm run e2e` | Playwright end-to-end tests (needs the dev database set up and the admin user from `.env`/defaults) |
| `npm run lint` / `npm run typecheck` / `npm run format` | Code checks and formatting |
| `npm run db:generate` | Create a migration after changing `src/server/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Starting data + admin user (safe to re-run) |
| `npm run db:studio` | Browse the database |
| `npm run storage:init` | Create buckets / set CORS |

## How booking capacity works

`src/server/services/availability-core.ts` is the whole rule set, as pure functions covered by tests.

- A time is offered if **at least one active team** that serves the category is free.
- "Free" means all of these:
  - The visit fits inside that team's working hours: the team's own hours, or the company default.
  - It doesn't overlap the team's time off.
  - Its time **plus the travel buffer** doesn't touch another job.
- Every job reserves `start → end + buffer`, so there is always at least one buffer between consecutive jobs.
- The buffer is set globally and can be overridden per service (Admin → Настройки).
- Minimum notice, how far ahead the calendar opens, and the slot interval are also in Settings.
- A new booking goes to the free team with the fewest jobs that day.
- A Postgres exclusion constraint (`drizzle/0001_booking_no_overlap.sql`) makes double-booking a team impossible, even when two customers click at the same moment. Covered by a test.

## Project layout

```
src/app/[locale]/(main)     main public design (home, services, booking, our work, legal, cancel)
src/app/[locale]/v2|v3|v4   alternative designs (noindex)
src/app/admin               admin panel
src/app/api                 auth + availability endpoints
src/components/booking      booking building blocks shared by all designs
src/server/services         business logic (availability, bookings, galleries, images, …)
src/server/actions          server actions (public booking, admin)
src/server/db               Drizzle schema, migrations runner, seed
messages/{bg,en}.json       all public-site text
drizzle/                    SQL migrations
```

## The four designs

A floating "Дизайн 1 · 2 · 3 · 4" switcher appears when `NEXT_PUBLIC_SHOW_VARIANTS=true`.

1. **Main (`/`)**: the original brief. Clean hero and 4 icon tiles, then category, visit type, date/time and details.
2. **Quick booking (`/v2`)** (Handy / Angi style): "What needs fixing?" search with common problems, then a step wizard with a progress bar and a sticky summary. Speed promise and free cancellation are shown.
3. **Trust-first (`/v3`)** (Mr. Handyman / Neighborly style): photo hero with phone and "Book now", then trust badges, how it works, services, recent job photos, reviews (placeholders), FAQ and service area.
4. **Mobile app-like (`/v4`)** (TaskRabbit / Airtasker style): bottom tab bar, big tiles, call/Viber/WhatsApp buttons, and a chat-style booking.

After choosing one, delete the other route folders, remove their entries from `src/i18n/routing.ts`, and set `NEXT_PUBLIC_SHOW_VARIANTS=false`.

## Deploying (recommended: Vercel + Neon + Cloudflare R2)

1. **Database:** create a Neon Postgres database in an EU region. Set `DATABASE_URL`, then run `npm run db:migrate` and `npm run db:seed` with it.
2. **Storage:** create two R2 buckets. Make the public one readable through a custom domain (or r2.dev) and set that as `S3_PUBLIC_URL`. Set `S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com`, leave `S3_FORCE_PATH_STYLE=false`, then run `npm run storage:init` to set CORS on the private bucket (browser uploads).
3. **Email:** create a Resend account, verify the domain, and set `RESEND_API_KEY` and `EMAIL_FROM`.
4. **Spam protection:** create a Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
5. **Site details:** set `SITE_URL`, `BETTER_AUTH_URL` and the `NEXT_PUBLIC_*` contact details.
6. **Notification email:** set it in Admin → Настройки.
7. **Legal pages:** complete them in `src/components/site/legal-content.ts`. They're drafts with `[placeholders]`.

To self-host instead, use the `Dockerfile`, which produces a standalone Node server.

## Still needed from the business

- Domain, logo and brand colour.
- Phone, Viber and WhatsApp numbers; email.
- Service area.
- Company details and lawyer-reviewed privacy and terms texts.
- Inspection price and warranty wording (FAQ in V3).
- Real customer reviews to replace the V3 placeholders.
