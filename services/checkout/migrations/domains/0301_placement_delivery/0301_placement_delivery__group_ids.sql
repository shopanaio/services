-- Up Migration
ALTER TABLE "checkout"."checkout_placements"
  ADD COLUMN "delivery_group_ids" jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "checkout"."checkout_placements"
  ADD CONSTRAINT "checkout_placements_delivery_group_ids_check"
    CHECK (jsonb_typeof("delivery_group_ids") = 'array');
