import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { getBookableDays, UnknownServiceError } from "@/server/services/availability";

const query = z.object({
  category: z.uuid(),
  type: z.enum(["inspection", "repair"]),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

/** GET /api/availability/days?category=…&type=…&month=2026-10 → { days: ["2026-10-05", …] } */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    const days = await getBookableDays(db, {
      categoryId: parsed.data.category,
      type: parsed.data.type,
      month: parsed.data.month,
    });
    return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof UnknownServiceError) return NextResponse.json({ error: "not-found" }, { status: 404 });
    throw error;
  }
}
