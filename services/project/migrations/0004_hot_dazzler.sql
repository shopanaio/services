ALTER TABLE "store"."store" ADD COLUMN "revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_store_revision" ON "store"."store" USING btree ("id","revision");