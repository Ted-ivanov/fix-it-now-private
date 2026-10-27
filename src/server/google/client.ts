// Minimal Google OAuth + Calendar API client (plain fetch, no SDK).
import { env } from "@/server/env";

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];
const CALENDAR = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function googleConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

export function redirectUri() {
  return `${env.SITE_URL}/api/google/callback`;
}

/** Google's consent screen. `prompt=consent` makes Google return a refresh token every time. */
export function authUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Access was revoked or the refresh token expired: the member has to connect again. */
export class GoogleAuthRevokedError extends Error {}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      ...params,
    }),
  });
  const json = (await res.json()) as Record<string, string>;
  if (!res.ok) {
    if (json.error === "invalid_grant") throw new GoogleAuthRevokedError(json.error_description ?? json.error);
    throw new Error(`Google token request failed: ${json.error ?? res.status}`);
  }
  return json;
}

/** Exchanges the code from the consent screen. The email comes from the ID token. */
export async function exchangeCode(code: string) {
  const json = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  // The ID token comes straight from Google over TLS, so its payload can be read without verifying.
  const payload = JSON.parse(Buffer.from(json.id_token.split(".")[1], "base64url").toString("utf8")) as {
    email?: string;
    email_verified?: boolean;
  };
  const scopes = (json.scope ?? "").split(" ");
  return {
    refreshToken: json.refresh_token as string | undefined,
    email: payload.email_verified ? payload.email : undefined,
    calendarGranted: scopes.includes("https://www.googleapis.com/auth/calendar.events"),
  };
}

export async function accessToken(refreshToken: string) {
  const json = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  return json.access_token;
}

export async function revokeToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(
    () => {},
  );
}

export type GoogleEvent = {
  id: string;
  summary: string;
  location: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders: { useDefault: false; overrides: { method: "popup" | "email"; minutes: number }[] };
  source?: { title: string; url: string };
};

async function calendarFetch(token: string, path: string, init: RequestInit) {
  return fetch(`${CALENDAR}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
  });
}

async function failed(res: Response, action: string) {
  const text = await res.text().catch(() => "");
  if (res.status === 401) throw new GoogleAuthRevokedError(`${action}: 401`);
  return new Error(`Google Calendar ${action} failed: ${res.status} ${text.slice(0, 300)}`);
}

/**
 * Creates the event with our own id, or updates it if it already exists. Google keeps deleted
 * events, so a cancelled booking that is reopened gets its event back through the update.
 */
export async function upsertEvent(token: string, event: GoogleEvent) {
  const created = await calendarFetch(token, "?sendUpdates=none", { method: "POST", body: JSON.stringify(event) });
  if (created.ok) return;
  if (created.status !== 409) throw await failed(created, "insert");

  const updated = await calendarFetch(token, `/${event.id}?sendUpdates=none`, {
    method: "PUT",
    body: JSON.stringify({ ...event, status: "confirmed" }),
  });
  if (!updated.ok) throw await failed(updated, "update");
}

/** Deleting an event that is already gone (404/410) counts as success. */
export async function deleteEvent(token: string, eventId: string) {
  const res = await calendarFetch(token, `/${eventId}?sendUpdates=none`, { method: "DELETE" });
  if (res.ok || res.status === 404 || res.status === 410) return;
  throw await failed(res, "delete");
}
