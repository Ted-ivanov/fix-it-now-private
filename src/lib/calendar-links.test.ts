import { describe, expect, it } from "vitest";
import { googleCalendarUrl, icsFile, type CalendarEntry } from "./calendar-links";

const entry: CalendarEntry = {
  uid: "abc@fix-it-now",
  title: "Fix It Now: Оглед и оферта – Електро услуги",
  description: "Номер: FN-7K3P9Q\nОтказване: https://example.com/otkazvane/xyz",
  location: "ул. Витоша 1, София; вх. Б",
  start: new Date("2026-10-05T06:00:00Z"),
  end: new Date("2026-10-05T07:00:00Z"),
};

describe("googleCalendarUrl", () => {
  it("uses UTC times and fills in the details", () => {
    const url = new URL(googleCalendarUrl(entry));
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("dates")).toBe("20261005T060000Z/20261005T070000Z");
    expect(url.searchParams.get("text")).toBe(entry.title);
    expect(url.searchParams.get("location")).toBe(entry.location);
  });
});

describe("icsFile", () => {
  const ics = icsFile(entry, new Date("2026-10-01T00:00:00Z"));
  const unfolded = ics.replace(/\r\n /g, "");

  it("is a valid calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("escapes commas, semicolons and new lines", () => {
    expect(unfolded).toContain("LOCATION:ул. Витоша 1\\, София\\; вх. Б");
    expect(unfolded).toContain("DESCRIPTION:Номер: FN-7K3P9Q\\nОтказване:");
  });

  it("folds long lines at 75 bytes without splitting characters", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(unfolded).toContain(`SUMMARY:${entry.title}`);
  });

  it("reminds 1 day and 1 hour before", () => {
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(ics).toContain("STATUS:CONFIRMED");
  });

  it("marks a cancelled visit and drops the reminders", () => {
    const cancelled = icsFile({ ...entry, cancelled: true });
    expect(cancelled).toContain("METHOD:CANCEL");
    expect(cancelled).toContain("STATUS:CANCELLED");
    expect(cancelled).not.toContain("VALARM");
  });
});
