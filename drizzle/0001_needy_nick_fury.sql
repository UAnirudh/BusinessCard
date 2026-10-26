ALTER TABLE "connections" ADD COLUMN "follow_up_date" text;--> statement-breakpoint
CREATE INDEX "connections_follow_up_idx" ON "connections" USING btree ("owner_id","follow_up_date");