// "Add to calendar" for customers: a Google Calendar link and an .ics file (iPhone, Outlook).

export type CalendarEntry = {
  uid: string;
  title: string;
  description: string;
  location: string;
  start: Date;
  end: Date;
  cancelled?: boolean;
};

/** 2026-10-05T09:00:00.000Z → 20261005T090000Z */
function utcStamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function googleCalendarUrl(entry: CalendarEntry) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: entry.title,
    dates: `${utcStamp(entry.start)}/${utcStamp(entry.end)}`,
    details: entry.description,
    location: entry.location,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function escapeText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** RFC 5545: lines longer than 75 bytes continue on the next line after a space. */
function fold(line: string) {
  if (byteLength(line) <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74; // continuation lines start with a space
    if (byteLength(current + char) > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/** One event with reminders 1 day and 1 hour before. */
export function icsFile(entry: CalendarEntry, now: Date = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fix It Now//Booking//BG",
    "CALSCALE:GREGORIAN",
    `METHOD:${entry.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${entry.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(entry.start)}`,
    `DTEND:${utcStamp(entry.end)}`,
    `SUMMARY:${escapeText(entry.title)}`,
    `DESCRIPTION:${escapeText(entry.description)}`,
    `LOCATION:${escapeText(entry.location)}`,
    `STATUS:${entry.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    ...(entry.cancelled
      ? []
      : ["-P1D", "-PT1H"].flatMap((trigger) => [
          "BEGIN:VALARM",
          "ACTION:DISPLAY",
          `DESCRIPTION:${escapeText(entry.title)}`,
          `TRIGGER:${trigger}`,
          "END:VALARM",
        ])),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
