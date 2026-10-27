// Keys for the Google Calendar feature, derived from BETTER_AUTH_SECRET so no extra secret is needed.
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";

function key(purpose: string) {
  return Buffer.from(hkdfSync("sha256", env.BETTER_AUTH_SECRET, "fix-it-now", purpose, 32));
}

/** AES-256-GCM, stored as base64url "iv.tag.ciphertext". Used for Google refresh tokens. */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key("google-token"), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((b) => b.toString("base64url")).join(".");
}

export function decrypt(stored: string): string {
  const [iv, tag, data] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key("google-token"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export type ConnectClaims = { memberId: string; nonce: string; expiresAt: number };

/** Signed token in a member's connect link and in the OAuth `state`. */
export function signConnectToken(claims: ConnectClaims): string {
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", key("google-connect")).update(body).digest("base64url");
  return `${body}.${sig}`;
}

/** Returns the claims if the signature is valid and the link has not expired. */
export function verifyConnectToken(token: string, now = Date.now()): ConnectClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key("google-connect")).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as ConnectClaims;
    return claims.expiresAt > now ? claims : null;
  } catch {
    return null;
  }
}
