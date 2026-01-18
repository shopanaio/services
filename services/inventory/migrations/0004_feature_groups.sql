ALTER TABLE "inventory"."product_feature"
  ADD COLUMN "is_group" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature"
  ADD COLUMN "parent_id" uuid REFERENCES "inventory"."product_feature"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature"
  ADD COLUMN "sort_index" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY id) - 1 AS new_sort_index
  FROM "inventory"."product_feature"
)
UPDATE "inventory"."product_feature"
SET "sort_index" = ranked.new_sort_index
FROM ranked
WHERE "inventory"."product_feature"."id" = ranked.id;
--> statement-breakpoint
ALTER TABLE "inventory"."product_feature"
  ADD CONSTRAINT "feature_group_no_parent"
  CHECK ("is_group" = false OR "parent_id" IS NULL);
--> statement-breakpoint
CREATE INDEX "product_feature_children_idx"
  ON "inventory"."product_feature" ("product_id", "parent_id", "sort_index");
--> statement-breakpoint
CREATE UNIQUE INDEX "product_feature_root_sort_idx"
  ON "inventory"."product_feature" ("product_id", "sort_index")
  WHERE "parent_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "product_feature_child_sort_idx"
  ON "inventory"."product_feature" ("product_id", "parent_id", "sort_index")
  WHERE "parent_id" IS NOT NULL;
