import { z } from "zod";

// Validated once at startup so a missing variable fails loudly instead of halfway through a booking.
const schema = z.object({
  DATABASE_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  SITE_URL: z.url(),

  S3_ENDPOINT: z.url().optional(), // empty for AWS; set for R2 / SeaweedFS
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_PUBLIC_BUCKET: z.string().min(1),
  S3_PRIVATE_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.url(), // base URL the public bucket is served from
  S3_FORCE_PATH_STYLE: z.stringbool().default(false), // true for SeaweedFS / MinIO

  RESEND_API_KEY: z.string().optional(), // without it emails are printed to the console
  EMAIL_FROM: z.string().default("Fix It Now <no-reply@example.com>"),

  TURNSTILE_SECRET_KEY: z.string().optional(), // without it the captcha check is skipped
});

// `next build` loads server modules without the real secrets (e.g. in a Docker build).
// Nothing connects anywhere during the build, so validation waits until the server runs.
const isBuild = process.env.NEXT_PHASE === "phase-production-build";

export const env: z.infer<typeof schema> = isBuild
  ? (schema.partial().parse(process.env) as z.infer<typeof schema>)
  : schema.parse(process.env);
