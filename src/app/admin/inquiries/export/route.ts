// CSV with every chat bot contact request, for Excel or a backup.
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { contactRequestsCsv, listContactRequests } from "@/server/services/contact-requests";
import { sofiaDay } from "@/server/services/time";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const csv = contactRequestsCsv(await listContactRequests(db));
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="zapitvania-${sofiaDay(new Date())}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
