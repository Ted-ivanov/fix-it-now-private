import { describe, expect, it } from "vitest";
import { contactRequestsCsv, type ContactRequest } from "@/server/services/contact-requests";
import { contactRequestSchema, parseContact } from "./contact-schema";

const base = { name: "Иван", description: "Течащ смесител в банята.", locale: "bg", consent: true } as const;

describe("parseContact", () => {
  it("recognizes Bulgarian phone numbers and emails", () => {
    expect(parseContact("0888 123 456")).toEqual({ phone: "+359888123456" });
    expect(parseContact(" Ivan@ABV.bg ")).toEqual({ email: "ivan@abv.bg" });
    expect(parseContact("утре")).toBeNull();
    expect(parseContact("ivan@")).toBeNull();
  });
});

describe("contactRequestSchema", () => {
  it("accepts a phone or an email alone", () => {
    expect(contactRequestSchema.parse({ ...base, phone: "0888123456" })).toMatchObject({
      phone: "+359888123456",
      email: null,
    });
    expect(contactRequestSchema.parse({ ...base, email: "a@b.bg", phone: "" })).toMatchObject({
      phone: null,
      email: "a@b.bg",
    });
  });

  it("requires at least one way to reach the customer", () => {
    const r = contactRequestSchema.safeParse({ ...base, phone: "", email: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("contactRequired");
  });

  it("requires consent and a description", () => {
    expect(contactRequestSchema.safeParse({ ...base, phone: "0888123456", consent: false }).success).toBe(false);
    expect(contactRequestSchema.safeParse({ ...base, phone: "0888123456", description: "ток" }).success).toBe(false);
  });
});

describe("contactRequestsCsv", () => {
  it("escapes cells and neutralizes spreadsheet formulas", () => {
    const row = {
      id: "1",
      name: "=HYPERLINK(1)",
      phone: "+359888123456",
      email: null,
      description: 'Ред 1, "кавички"\nРед 2',
      locale: "bg",
      pageUrl: "/",
      handled: false,
      consentAt: new Date("2026-10-20T07:00:00Z"),
      createdAt: new Date("2026-10-20T07:00:00Z"),
      updatedAt: new Date("2026-10-20T07:00:00Z"),
    } satisfies ContactRequest;
    const csv = contactRequestsCsv([row]);
    expect(csv.startsWith("﻿Дата,Име")).toBe(true);
    expect(csv).toContain('2026-10-20 10:00,\'=HYPERLINK(1),\'+359888123456,,"Ред 1, ""кавички""\nРед 2",bg,не,/');
  });
});
