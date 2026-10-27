// Connecting and disconnecting a team member's Google Calendar.
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Db } from "@/server/db";
import { teamMember } from "@/server/db/schema";
import { env } from "@/server/env";
import { exchangeCode, revokeToken } from "./client";
import { decrypt, encrypt, signConnectToken, verifyConnectToken } from "./crypto";
import { removeMemberUpcoming } from "./sync";

export const CONNECT_LINK_HOURS = 72;

/**
 * A link the admin sends to the member (e.g. over Viber). It works once and expires after
 * 72 hours; making a new link invalidates the previous one.
 */
export async function createConnectLink(db: Db, memberId: string, now = Date.now()) {
  const nonce = randomBytes(16).toString("base64url");
  await db.update(teamMember).set({ connectNonce: nonce }).where(eq(teamMember.id, memberId));
  const token = signConnectToken({ memberId, nonce, expiresAt: now + CONNECT_LINK_HOURS * 3600_000 });
  return `${env.SITE_URL}/api/google/connect?t=${encodeURIComponent(token)}`;
}

/** Finds the member a still-valid, unused link belongs to. */
export async function memberForToken(db: Db, token: string) {
  const claims = verifyConnectToken(token);
  if (!claims) return null;
  const [member] = await db.select().from(teamMember).where(eq(teamMember.id, claims.memberId));
  if (!member || !member.connectNonce || member.connectNonce !== claims.nonce) return null;
  return member;
}

export type ConnectResult =
  | { ok: true; memberId: string; name: string; googleEmail: string }
  | { ok: false; reason: "link" | "scope" | "email-mismatch" | "no-refresh-token"; expectedEmail?: string };

/** Handles Google's redirect back to the site with the authorization code. */
export async function completeConnect(db: Db, state: string, code: string): Promise<ConnectResult> {
  const member = await memberForToken(db, state);
  if (!member) return { ok: false, reason: "link" };

  const result = await exchangeCode(code);
  if (!result.calendarGranted) {
    if (result.refreshToken) await revokeToken(result.refreshToken);
    return { ok: false, reason: "scope" };
  }
  if (!result.refreshToken || !result.email) return { ok: false, reason: "no-refresh-token" };
  if (member.email && member.email.toLowerCase() !== result.email.toLowerCase()) {
    await revokeToken(result.refreshToken);
    return { ok: false, reason: "email-mismatch", expectedEmail: member.email };
  }

  // Connecting again replaces the old token; revoke it so it can't be used any more.
  if (member.googleRefreshToken) await revokeToken(decrypt(member.googleRefreshToken));

  await db
    .update(teamMember)
    .set({
      googleRefreshToken: encrypt(result.refreshToken),
      googleEmail: result.email,
      googleConnectedAt: new Date(),
      googleError: null,
      connectNonce: null,
    })
    .where(eq(teamMember.id, member.id));
  return { ok: true, memberId: member.id, name: member.name, googleEmail: result.email };
}

/** Removes upcoming jobs from the member's calendar, then revokes and forgets the token. */
export async function disconnectGoogle(db: Db, memberId: string) {
  const [member] = await db.select().from(teamMember).where(eq(teamMember.id, memberId));
  if (!member) return;
  if (member.googleRefreshToken) {
    await removeMemberUpcoming(db, member);
    const token = decrypt(member.googleRefreshToken);
    await revokeToken(token);
  }
  await db
    .update(teamMember)
    .set({ googleRefreshToken: null, googleEmail: null, googleConnectedAt: null, googleError: null, connectNonce: null })
    .where(eq(teamMember.id, memberId));
}

