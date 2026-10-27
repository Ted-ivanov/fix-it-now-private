// The link a team member opens to connect their Google Calendar: checks it, then sends them to Google.
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { authUrl, googleConfigured } from "@/server/google/client";
import { memberForToken } from "@/server/google/connect";
import { messagePage } from "@/server/google/page";

export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return messagePage("Google Calendar не е настроен", "Свържете се с офиса.", 503);
  }
  const token = request.nextUrl.searchParams.get("t") ?? "";
  if (!(await memberForToken(db, token))) {
    return messagePage(
      "Линкът не е валиден",
      "Линкът е изтекъл или вече е използван. Помолете офиса за нов линк.",
      410,
    );
  }
  return NextResponse.redirect(authUrl(token));
}
