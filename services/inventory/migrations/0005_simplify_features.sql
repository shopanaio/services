-- Migration: Simplify features by removing slug and using int[] index
-- This migration:
-- 1. Removes slug columns from features and values
-- 2. Replaces sort_index with index: int[] for tree position
-- 3. Adds DEFERRABLE unique constraints

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 1: Drop old unique constraints and indexes on slug
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature"
  DROP CONSTRAINT IF EXISTS "product_feature_product_id_slug_key";
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 2: Drop partial unique indexes on sort_index
-- ═══════════════════════════════════════════════════════════════════════════

DROP INDEX IF EXISTS "inventory"."product_feature_root_sort_idx";
--> statement-breakpoint

DROP INDEX IF EXISTS "inventory"."product_feature_child_sort_idx";
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 3: Add index column as int[]
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature"
  ADD COLUMN "index" integer[] NOT NULL DEFAULT '{}';
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 4: Migrate data from sort_index to index
-- Root features (parent_id IS NULL): index = [sort_index]
-- Child features (parent_id IS NOT NULL): index = [parent_sort_index, sort_index]
-- ═══════════════════════════════════════════════════════════════════════════

WITH parent_indexes AS (
  SELECT id, sort_index
  FROM "inventory"."product_feature"
  WHERE parent_id IS NULL
)
UPDATE "inventory"."product_feature" f
SET "index" = CASE
  WHEN f.parent_id IS NULL THEN ARRAY[f.sort_index]
  ELSE ARRAY[p.sort_index, f.sort_index]
END
FROM parent_indexes p
WHERE f.parent_id = p.id OR (f.parent_id IS NULL AND f.id = p.id);
--> statement-breakpoint

-- Handle any orphan records (features without parent but parent_id is NULL)
UPDATE "inventory"."product_feature"
SET "index" = ARRAY[sort_index]
WHERE parent_id IS NULL AND "index" = '{}';
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 5: Add DEFERRABLE unique constraint on (product_id, index)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature"
  ADD CONSTRAINT "product_feature_product_id_index_uniq"
    UNIQUE ("product_id", "index")
    DEFERRABLE INITIALLY DEFERRED;
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 6: Add CHECK constraints for index
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature"
  ADD CONSTRAINT "feature_index_not_empty"
    CHECK (array_length("index", 1) > 0);
--> statement-breakpoint

ALTER TABLE "inventory"."product_feature"
  ADD CONSTRAINT "feature_group_root_only"
    CHECK ("is_group" = false OR array_length("index", 1) = 1);
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 7: Drop old columns from product_feature
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature"
  DROP COLUMN "sort_index";
--> statement-breakpoint

ALTER TABLE "inventory"."product_feature"
  DROP COLUMN "slug";
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 8: Create sort index for efficient ordering
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX "product_feature_sort_idx"
  ON "inventory"."product_feature" ("product_id", "index");
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 9: Handle product_feature_value table
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature_value"
  DROP CONSTRAINT IF EXISTS "product_feature_value_feature_id_slug_key";
--> statement-breakpoint

ALTER TABLE "inventory"."product_feature_value"
  DROP COLUMN "slug";
--> statement-breakpoint

ALTER TABLE "inventory"."product_feature_value"
  RENAME COLUMN "sort_index" TO "index";
--> statement-breakpoint

-- ═══════════════════════════════════════════════════════════════════════════
-- Step 10: Add DEFERRABLE unique constraint for value index
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE "inventory"."product_feature_value"
  ADD CONSTRAINT "product_feature_value_feature_id_index_uniq"
    UNIQUE ("feature_id", "index")
    DEFERRABLE INITIALLY DEFERRED;
