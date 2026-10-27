// .ics file for the customer's own calendar (iPhone, Outlook). The token is the booking's cancel token.
import { db } from "@/server/db";
import { icsFile } from "@/lib/calendar-links";
import { cancelUrl, customerCalendarEntry, loadCustomerBooking } from "@/server/services/customer-calendar";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[\w-]{32}$/.test(token)) return new Response("Not found", { status: 404 });
  const row = await loadCustomerBooking(db, { cancelToken: token });
  if (!row) return new Response("Not found", { status: 404 });

  const ics = icsFile(customerCalendarEntry(row, cancelUrl(row.booking.locale, token)));
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="fix-it-now-${row.booking.ref}.ics"`,
      "cache-control": "private, no-store",
      "x-robots-tag": "noindex",
    },
  });
}
