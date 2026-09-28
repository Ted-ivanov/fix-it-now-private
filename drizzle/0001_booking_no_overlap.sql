-- A team can never have two active jobs whose time (including travel buffer) overlaps.
-- Postgres enforces this even when two customers book the same slot at the same moment.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "booking"
  ADD CONSTRAINT "booking_team_no_overlap"
  EXCLUDE USING gist (
    "team_id" WITH =,
    tstzrange("start_at", "blocked_until", '[)') WITH &&
  ) WHERE ("status" <> 'cancelled');
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_times_valid"
  CHECK ("start_at" < "end_at" AND "end_at" <= "blocked_until");
--> statement-breakpoint
ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_valid"
  CHECK ("weekday" BETWEEN 1 AND 7 AND "open_minute" >= 0 AND "open_minute" < "close_minute" AND "close_minute" <= 1440);
--> statement-breakpoint
ALTER TABLE "team_time_off" ADD CONSTRAINT "team_time_off_valid" CHECK ("start_at" < "end_at");
--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_single_row" CHECK ("id" = 1);
