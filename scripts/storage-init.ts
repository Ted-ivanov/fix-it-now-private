// npm run storage:init: creates the buckets (local SeaweedFS) and sets browser-upload CORS.
// For Cloudflare R2, create the buckets in the dashboard; this script then only sets CORS.
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const { CreateBucketCommand, PutBucketCorsCommand, PutBucketPolicyCommand } = await import(
  "@aws-sdk/client-s3"
);
const { s3 } = await import("../src/server/storage");
const { env } = await import("../src/server/env");

async function tryStep(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    console.log(`✓ ${label}`);
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "BucketAlreadyOwnedByYou" || name === "BucketAlreadyExists") {
      console.log(`✓ ${label} (already exists)`);
    } else {
      console.warn(`! ${label}: ${name ?? error}`);
    }
  }
}

for (const bucket of [env.S3_PUBLIC_BUCKET, env.S3_PRIVATE_BUCKET]) {
  await tryStep(`bucket ${bucket}`, () => s3.send(new CreateBucketCommand({ Bucket: bucket })));
}

// Anyone may read the public bucket (gallery images).
await tryStep(`public read on ${env.S3_PUBLIC_BUCKET}`, () =>
  s3.send(
    new PutBucketPolicyCommand({
      Bucket: env.S3_PUBLIC_BUCKET,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${env.S3_PUBLIC_BUCKET}/*`],
          },
        ],
      }),
    }),
  ),
);

// The admin's browser uploads originals straight to the private bucket with presigned URLs.
await tryStep(`CORS on ${env.S3_PRIVATE_BUCKET}`, () =>
  s3.send(
    new PutBucketCorsCommand({
      Bucket: env.S3_PRIVATE_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: [env.SITE_URL],
            AllowedMethods: ["PUT"],
            AllowedHeaders: ["*"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  ),
);

process.exit(0);
