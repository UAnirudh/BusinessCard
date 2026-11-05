CREATE TABLE "pending_signups" (
	"email" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_signups_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE INDEX "pending_signups_expiry_idx" ON "pending_signups" USING btree ("expires_at");
--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "is_public" SET DEFAULT false;
--> statement-breakpoint
ALTER TABLE "cards" ALTER COLUMN "collect_leads" SET DEFAULT false;
