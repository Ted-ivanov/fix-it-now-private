CREATE TABLE "contact_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"description" text NOT NULL,
	"locale" "locale" DEFAULT 'bg' NOT NULL,
	"page_url" text,
	"handled" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "contact_emails" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
CREATE INDEX "contact_request_created" ON "contact_request" USING btree ("created_at");