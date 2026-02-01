-- Add revision column for optimistic locking in ProductUpdateWorkflow
ALTER TABLE "inventory"."product" ADD COLUMN "revision" integer NOT NULL DEFAULT 0;

-- Index for fast revision check during compare-and-swap
CREATE INDEX "idx_product_revision" ON "inventory"."product" ("id", "revision");
