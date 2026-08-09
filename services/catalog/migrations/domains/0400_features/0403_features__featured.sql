-- Up Migration

ALTER TABLE "catalog"."product_feature"
  ADD COLUMN "featured" boolean NOT NULL DEFAULT false;
