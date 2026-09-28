import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { truncateAll } from "@/server/db/seed-data";
import { checkRateLimit } from "./rate-limit";

beforeEach(() => truncateAll(db));

describe("checkRateLimit", () => {
  it("allows up to the limit within a window and resets in the next window", async () => {
    const t0 = new Date("2026-10-01T10:00:05Z");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await checkRateLimit(db, "k", 3, 600, t0));
    expect(results).toEqual([true, true, true, false]);

    const nextWindow = new Date("2026-10-01T10:10:01Z");
    expect(await checkRateLimit(db, "k", 3, 600, nextWindow)).toBe(true);
    expect(await checkRateLimit(db, "other", 3, 600, t0)).toBe(true);
  });
});
