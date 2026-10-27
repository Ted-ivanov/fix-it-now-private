// Starting data: the four service categories, visit durations, two sample teams and
// company working hours. Safe to run more than once (existing rows are left alone).
import { sql } from "drizzle-orm";
import type { Db } from "./index";
import {
  serviceCategory,
  settings,
  team,
  teamCategory,
  visitTypeConfig,
  workingHours,
} from "./schema";

const categories = [
  {
    slugBg: "elektro",
    slugEn: "electrical",
    nameBg: "Електро услуги",
    nameEn: "Electrical",
    descriptionBg: "Контакти, ключове, осветление, табла и дребни електро ремонти.",
    descriptionEn: "Sockets, switches, lighting, fuse boxes and small electrical fixes.",
    icon: "zap",
    sort: 1,
    inspection: 60,
    repair: 120,
  },
  {
    slugBg: "vik",
    slugEn: "plumbing",
    nameBg: "ВиК",
    nameEn: "Plumbing",
    descriptionBg: "Течове, смесители, сифони, бойлери и отпушване.",
    descriptionEn: "Leaks, taps, drains, water heaters and unclogging.",
    icon: "droplets",
    sort: 2,
    inspection: 60,
    repair: 120,
  },
  {
    slugBg: "dovarshitelni-raboti",
    slugEn: "interior-finishing",
    nameBg: "Довършителни работи",
    nameEn: "Interior Finishing",
    descriptionBg: "Боядисване, шпакловка, плочки, гипсокартон и монтаж.",
    descriptionEn: "Painting, plastering, tiling, drywall and fitting.",
    icon: "paint-roller",
    sort: 3,
    inspection: 60,
    repair: 180,
  },
  {
    slugBg: "drugi",
    slugEn: "other-repairs",
    nameBg: "Други",
    nameEn: "Other Repairs",
    descriptionBg: "Монтаж на мебели, врати, рафтове и други дребни поправки у дома.",
    descriptionEn: "Furniture assembly, doors, shelves and other small fixes at home.",
    icon: "wrench",
    sort: 4,
    inspection: 60,
    repair: 90,
  },
];

export async function seed(db: Db) {
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  const existing = await db.select({ id: serviceCategory.id }).from(serviceCategory).limit(1);
  if (existing.length > 0) return { seeded: false };

  await db.transaction(async (tx) => {
    const created = await tx
      .insert(serviceCategory)
      .values(categories.map(({ inspection: _i, repair: _r, ...c }) => c))
      .returning();
    const bySlug = new Map(created.map((c) => [c.slugBg, c.id]));

    await tx.insert(visitTypeConfig).values(
      categories.flatMap((c) => [
        { categoryId: bySlug.get(c.slugBg)!, type: "inspection" as const, durationMinutes: c.inspection },
        { categoryId: bySlug.get(c.slugBg)!, type: "repair" as const, durationMinutes: c.repair },
      ]),
    );

    const [team1, team2] = await tx
      .insert(team)
      .values([{ name: "Екип 1" }, { name: "Екип 2" }])
      .returning();
    await tx.insert(teamCategory).values([
      { teamId: team1.id, categoryId: bySlug.get("elektro")! },
      { teamId: team1.id, categoryId: bySlug.get("drugi")! },
      { teamId: team2.id, categoryId: bySlug.get("vik")! },
      { teamId: team2.id, categoryId: bySlug.get("dovarshitelni-raboti")! },
      { teamId: team2.id, categoryId: bySlug.get("drugi")! },
    ]);

    // Company hours: Monday–Friday 08:00–18:00, Saturday 09:00–14:00.
    await tx.insert(workingHours).values([
      ...[1, 2, 3, 4, 5].map((weekday) => ({
        teamId: null,
        weekday,
        openMinute: 8 * 60,
        closeMinute: 18 * 60,
      })),
      { teamId: null, weekday: 6, openMinute: 9 * 60, closeMinute: 14 * 60 },
    ]);
  });

  return { seeded: true };
}

/** Test helper: empties every app table (keeps the schema). */
export async function truncateAll(db: Db) {
  await db.execute(sql`
    TRUNCATE booking_photo, booking, gallery_photo, gallery, team_time_off, working_hours,
      team_category, team_member, team, visit_type_config, service_category, closed_day, settings,
      contact_request, rate_limit, session, account, verification, "user"
    RESTART IDENTITY CASCADE
  `);
}
