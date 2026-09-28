import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/server/db";
import { getSlots, UnknownServiceError } from "@/server/services/availability";
import { sofiaTime } from "@/server/services/time";

const query = z.object({
  category: z.uuid(),
  type: z.enum(["inspection", "repair"]),
  day: z.iso.date(),
});

/** GET /api/availability/slots?category=…&type=…&day=2026-10-05 → { slots: [{ start, label }] } */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad-request" }, { status: 400 });
  try {
    const slots = await getSlots(db, {
      categoryId: parsed.data.category,
      type: parsed.data.type,
      day: parsed.data.day,
    });
    // Team details stay on the server; the customer only needs the times.
    return NextResponse.json(
      { slots: slots.map((s) => ({ start: s.start.toISOString(), label: sofiaTime(s.start) })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof UnknownServiceError) return NextResponse.json({ error: "not-found" }, { status: 404 });
    throw error;
  }
}
