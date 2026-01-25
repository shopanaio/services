-- Make feature unique constraints deferrable for bulk sync operations
-- This allows inserting/updating features with index changes within a transaction

-- Drop existing constraints
ALTER TABLE "inventory"."product_feature" DROP CONSTRAINT "product_feature_product_id_index_uniq";
ALTER TABLE "inventory"."product_feature_value" DROP CONSTRAINT "product_feature_value_feature_id_index_uniq";

-- Recreate with DEFERRABLE INITIALLY DEFERRED
ALTER TABLE "inventory"."product_feature" ADD CONSTRAINT "product_feature_product_id_index_uniq"
  UNIQUE ("product_id", "index") DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE "inventory"."product_feature_value" ADD CONSTRAINT "product_feature_value_feature_id_index_uniq"
  UNIQUE ("feature_id", "index") DEFERRABLE INITIALLY DEFERRED;
