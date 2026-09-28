// S3-compatible object storage (Cloudflare R2 in production, SeaweedFS locally).
// Two buckets: a public one for gallery images and a private one for customer photos.
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/server/env";

export type Bucket = "public" | "private";

const globalForS3 = globalThis as unknown as { s3?: S3Client };

const s3 =
  globalForS3.s3 ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: { accessKeyId: env.S3_ACCESS_KEY_ID, secretAccessKey: env.S3_SECRET_ACCESS_KEY },
    // Newer SDKs sign a checksum of an empty body into presigned upload URLs, which makes
    // browser uploads fail on R2/SeaweedFS. Only add checksums where S3 requires them.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
if (process.env.NODE_ENV !== "production") globalForS3.s3 = s3;

function bucketName(bucket: Bucket) {
  return bucket === "public" ? env.S3_PUBLIC_BUCKET : env.S3_PRIVATE_BUCKET;
}

export async function putObject(bucket: Bucket, key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucketName(bucket),
      Key: key,
      Body: body,
      ContentType: contentType,
      // Keys are never reused, so public images can be cached forever.
      CacheControl: bucket === "public" ? "public, max-age=31536000, immutable" : "private, no-store",
    }),
  );
}

export async function getObject(bucket: Bucket, key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucketName(bucket), Key: key }));
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function deleteObjects(bucket: Bucket, keys: string[]) {
  if (keys.length === 0) return;
  for (let i = 0; i < keys.length; i += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucketName(bucket),
        Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }
}

/** URL the browser can PUT a file to directly (admin uploads skip the app server). */
export async function presignUpload(key: string, contentType: string, expiresIn = 600) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: env.S3_PRIVATE_BUCKET, Key: key, ContentType: contentType }),
    { expiresIn },
  );
}

/** Short-lived link to a private object (customer photos in the admin). */
export async function presignDownload(key: string, expiresIn = 300) {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_PRIVATE_BUCKET, Key: key }), {
    expiresIn,
  });
}

export function publicUrl(key: string) {
  return `${env.S3_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
}

export { s3 };
