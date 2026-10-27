CREATE TABLE "team_member" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"reminders" jsonb DEFAULT '[{"method":"popup","minutes":1440},{"method":"popup","minutes":60}]'::jsonb NOT NULL,
	"google_email" text,
	"google_refresh_token" text,
	"google_connected_at" timestamp with time zone,
	"google_error" text,
	"connect_nonce" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_member" ADD CONSTRAINT "team_member_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_member_team" ON "team_member" USING btree ("team_id");