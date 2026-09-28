import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export * from "./auth-schema";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const visitTypeEnum = pgEnum("visit_type", ["inspection", "repair"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "confirmed",
  "done",
  "cancelled",
]);
export const localeEnum = pgEnum("locale", ["bg", "en"]);

// ---------------------------------------------------------------------------------------------
// Services and capacity
// ---------------------------------------------------------------------------------------------

export const serviceCategory = pgTable("service_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Each language has its own URL slug: /uslugi/elektro and /en/services/electrical.
  slugBg: text("slug_bg").notNull().unique(),
  slugEn: text("slug_en").notNull().unique(),
  nameBg: text("name_bg").notNull(),
  nameEn: text("name_en"),
  descriptionBg: text("description_bg"),
  descriptionEn: text("description_en"),
  icon: text("icon").notNull(), // lucide icon name, see components/category-icon.tsx
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  // Travel buffer for this category; null means use the global setting.
  bufferMinutes: integer("buffer_minutes"),
  ...timestamps,
});

export const visitTypeConfig = pgTable(
  "visit_type_config",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategory.id, { onDelete: "cascade" }),
    type: visitTypeEnum("type").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
  },
  (t) => [uniqueIndex("visit_type_config_category_type").on(t.categoryId, t.type)],
);

export const team = pgTable("team", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const teamCategory = pgTable(
  "team_category",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategory.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.categoryId] })],
);

// Weekly opening hours. Rows with team_id = null are the company default; a team that has
// any rows of its own uses only those. weekday: 1 = Monday … 7 = Sunday (ISO).
export const workingHours = pgTable(
  "working_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id").references(() => team.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    openMinute: smallint("open_minute").notNull(), // minutes after midnight, e.g. 480 = 08:00
    closeMinute: smallint("close_minute").notNull(),
  },
  (t) => [index("working_hours_team").on(t.teamId)],
);

export const teamTimeOff = pgTable(
  "team_time_off",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id, { onDelete: "cascade" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    reason: text("reason"),
  },
  (t) => [index("team_time_off_team_start").on(t.teamId, t.startAt)],
);

// Company-wide days off (public holidays, vacations).
export const closedDay = pgTable("closed_day", {
  day: date("day").primaryKey(),
  note: text("note"),
});

// Single row (id = 1) with the booking rules the admin can change.
export const settings = pgTable("settings", {
  id: smallint("id").primaryKey().default(1),
  travelBufferMinutes: integer("travel_buffer_minutes").notNull().default(30),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  bookingHorizonDays: integer("booking_horizon_days").notNull().default(30),
  minNoticeHours: integer("min_notice_hours").notNull().default(12),
  notificationEmail: text("notification_email"),
  ...timestamps,
});

// ---------------------------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------------------------

export const booking = pgTable(
  "booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ref: text("ref").notNull().unique(), // short code shown to the customer, e.g. FN-7K3P9Q
    categoryId: uuid("category_id")
      .notNull()
      .references(() => serviceCategory.id),
    visitType: visitTypeEnum("visit_type").notNull(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => team.id),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    // end_at + travel buffer. The team is unavailable for other jobs until then.
    blockedUntil: timestamp("blocked_until", { withTimezone: true }).notNull(),
    customerName: text("customer_name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    address: text("address").notNull(),
    description: text("description").notNull(),
    locale: localeEnum("locale").notNull().default("bg"),
    status: bookingStatusEnum("status").notNull().default("pending"),
    repairDisclaimerAcceptedAt: timestamp("repair_disclaimer_accepted_at", { withTimezone: true }),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    cancelToken: text("cancel_token").notNull().unique(),
    adminNote: text("admin_note"),
    ...timestamps,
  },
  (t) => [
    index("booking_start").on(t.startAt),
    index("booking_team_start").on(t.teamId, t.startAt),
    // The exclusion constraint (no overlapping jobs per team) is added in a SQL migration,
    // see drizzle/0001_booking_no_overlap.sql.
  ],
);

export const bookingPhoto = pgTable("booking_photo", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => booking.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(), // in the private bucket
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Simple fixed-window rate limiter that works on serverless (no in-memory state).
export const rateLimit = pgTable("rate_limit", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
  count: integer("count").notNull(),
});

// ---------------------------------------------------------------------------------------------
// Galleries ("Completed work")
// ---------------------------------------------------------------------------------------------

export const gallery = pgTable("gallery", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  titleBg: text("title_bg").notNull(),
  titleEn: text("title_en"),
  descriptionBg: text("description_bg"),
  descriptionEn: text("description_en"),
  categoryId: uuid("category_id").references(() => serviceCategory.id, { onDelete: "set null" }),
  coverPhotoId: uuid("cover_photo_id"),
  published: boolean("published").notNull().default(false),
  ...timestamps,
});

export const galleryPhoto = pgTable(
  "gallery_photo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    galleryId: uuid("gallery_id")
      .notNull()
      .references(() => gallery.id, { onDelete: "cascade" }),
    largeKey: text("large_key").notNull(),
    thumbKey: text("thumb_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurDataUrl: text("blur_data_url").notNull(),
    captionBg: text("caption_bg"),
    captionEn: text("caption_en"),
    sort: integer("sort").notNull().default(0),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("gallery_photo_gallery_sort").on(t.galleryId, t.sort)],
);

// ---------------------------------------------------------------------------------------------
// Relations (for db.query.* with `with`)
// ---------------------------------------------------------------------------------------------

export const serviceCategoryRelations = relations(serviceCategory, ({ many }) => ({
  visitTypes: many(visitTypeConfig),
  teams: many(teamCategory),
}));

export const visitTypeConfigRelations = relations(visitTypeConfig, ({ one }) => ({
  category: one(serviceCategory, {
    fields: [visitTypeConfig.categoryId],
    references: [serviceCategory.id],
  }),
}));

export const teamRelations = relations(team, ({ many }) => ({
  categories: many(teamCategory),
  workingHours: many(workingHours),
  timeOff: many(teamTimeOff),
}));

export const teamCategoryRelations = relations(teamCategory, ({ one }) => ({
  team: one(team, { fields: [teamCategory.teamId], references: [team.id] }),
  category: one(serviceCategory, {
    fields: [teamCategory.categoryId],
    references: [serviceCategory.id],
  }),
}));

export const workingHoursRelations = relations(workingHours, ({ one }) => ({
  team: one(team, { fields: [workingHours.teamId], references: [team.id] }),
}));

export const teamTimeOffRelations = relations(teamTimeOff, ({ one }) => ({
  team: one(team, { fields: [teamTimeOff.teamId], references: [team.id] }),
}));

export const bookingRelations = relations(booking, ({ one, many }) => ({
  category: one(serviceCategory, {
    fields: [booking.categoryId],
    references: [serviceCategory.id],
  }),
  team: one(team, { fields: [booking.teamId], references: [team.id] }),
  photos: many(bookingPhoto),
}));

export const bookingPhotoRelations = relations(bookingPhoto, ({ one }) => ({
  booking: one(booking, { fields: [bookingPhoto.bookingId], references: [booking.id] }),
}));

export const galleryRelations = relations(gallery, ({ one, many }) => ({
  category: one(serviceCategory, {
    fields: [gallery.categoryId],
    references: [serviceCategory.id],
  }),
  photos: many(galleryPhoto),
}));

export const galleryPhotoRelations = relations(galleryPhoto, ({ one }) => ({
  gallery: one(gallery, { fields: [galleryPhoto.galleryId], references: [gallery.id] }),
}));
