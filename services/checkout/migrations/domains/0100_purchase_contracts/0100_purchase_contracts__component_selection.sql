ALTER TABLE "platform"."checkout_line_items"
  ADD COLUMN "component_item_id" uuid;

ALTER TABLE "platform"."checkout_line_items"
  ADD CONSTRAINT "checkout_line_items_component_parent_check"
  CHECK (
    ("parent_line_item_id" IS NULL AND "component_item_id" IS NULL)
    OR
    ("parent_line_item_id" IS NOT NULL AND "component_item_id" IS NOT NULL)
  );

CREATE INDEX "checkout_line_items_component_item_idx"
  ON "platform"."checkout_line_items" ("component_item_id")
  WHERE "component_item_id" IS NOT NULL;
